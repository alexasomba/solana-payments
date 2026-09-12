import { parseAddMemoInstruction } from "@solana-program/memo";
import { getCreateAccountInstruction } from "@solana-program/system";
import {
  decodeToken,
  getCreateAssociatedTokenIdempotentInstruction,
  getInitializeMintInstruction,
  getMintToCheckedInstruction,
  parseTransferCheckedInstruction,
  TOKEN_PROGRAM_ADDRESS,
} from "@solana-program/token";
import {
  appendTransactionMessageInstructions,
  createTransactionMessage,
  generateKeyPairSigner,
  getBase58Decoder,
  getCompiledTransactionMessageDecoder,
  getTransactionDecoder,
  lamports,
  setTransactionMessageFeePayerSigner,
  signTransactionMessageWithSigners,
  decompileTransactionMessage,
  type Address,
  type EncodedAccount,
  type Instruction,
  type Transaction,
  type TransactionSigner,
} from "@solana/kit";
import { LiteSVM } from "litesvm";
import { describe, expect, it } from "vite-plus/test";

import { createSolanaUsdt, MemoryIdempotencyStore } from "../src/index.js";
import { getAssociatedTokenAddress } from "../src/token.js";

const commitment = "confirmed";
const decimals = 6;
const mintAccountSize = 82n;

describe("LiteSVM Solana USDT-style integration", () => {
  it("creates a local mint, sends tokens through the SDK, verifies, and monitors", async () => {
    const svm = new LiteSVM().withTransactionHistory(256n);
    const payer = await generateKeyPairSigner();
    const mint = await generateKeyPairSigner();
    const recipient = await generateKeyPairSigner();

    svm.airdrop(payer.address, lamports(2_000_000_000n));

    await sendLiteSvmInstructions(svm, payer, [
      getCreateAccountInstruction({
        payer,
        newAccount: mint,
        lamports: svm.minimumBalanceForRentExemption(mintAccountSize),
        space: mintAccountSize,
        programAddress: TOKEN_PROGRAM_ADDRESS,
      }),
      getInitializeMintInstruction({
        mint: mint.address,
        decimals,
        mintAuthority: payer.address,
      }),
    ]);

    const sourceAta = await getAssociatedTokenAddress(payer.address, mint.address);
    await sendLiteSvmInstructions(svm, payer, [
      getCreateAssociatedTokenIdempotentInstruction({
        payer,
        ata: sourceAta,
        owner: payer.address,
        mint: mint.address,
      }),
      getMintToCheckedInstruction({
        mint: mint.address,
        token: sourceAta,
        mintAuthority: payer,
        amount: 5_000_000n,
        decimals,
      }),
    ]);

    const rpc = createLiteSvmRpc(svm);
    const client = createSolanaUsdt({
      rpcUrl: "litesvm://local",
      rpc,
      signer: payer,
      commitment,
      mint: mint.address,
      decimals,
      timeoutMs: 5_000,
      idempotencyStore: new MemoryIdempotencyStore(),
    });

    const reference = `local-${Date.now()}`;
    const transfer = await client.transfers.create({
      to: recipient.address,
      amount: "1.25",
      reference,
      idempotencyKey: reference,
    });

    expect(transfer.reference).toBe(reference);
    expect(transfer.confirmationStatus).toBe("confirmed");
    expect(transfer.amount).toBe(1_250_000n);

    const verified = await client.payments.verify({
      signature: transfer.signature,
      reference,
      recipient: recipient.address,
      amount: "1.25",
    });
    expect(verified.found).toBe(true);
    expect(verified.recipient).toBe(recipient.address);
    expect(verified.recipientTokenAccount).toBe(transfer.destinationTokenAccount);

    const monitored = await client.payments.monitor({ recipient: recipient.address, limit: 10 });
    expect(monitored.payments.some((payment) => payment.signature === transfer.signature)).toBe(
      true,
    );

    const recipientBalance = await client.balances.retrieve({ owner: recipient.address });
    expect(recipientBalance.amount).toBe(1_250_000n);
    expect(recipientBalance.tokenAccount).toBe(transfer.destinationTokenAccount);
  });
});

async function sendLiteSvmInstructions(
  svm: LiteSVM,
  payer: TransactionSigner,
  instructions: Instruction[],
): Promise<string> {
  const message = appendTransactionMessageInstructions(
    instructions,
    svm.setTransactionMessageLifetimeUsingLatestBlockhash(
      setTransactionMessageFeePayerSigner(payer, createTransactionMessage({ version: 0 })),
    ),
  );
  const transaction = await signTransactionMessageWithSigners(message);
  const result = svm.sendTransaction(transaction);
  if (isFailedTransaction(result)) {
    throw new Error(result.toString());
  }
  return getBase58Decoder().decode(result.signature());
}

function createLiteSvmRpc(svm: LiteSVM): LiteSvmRpc {
  const transactions = new Map<string, unknown>();
  const signaturesByAddress = new Map<string, string[]>();
  const signatureStatuses = new Map<
    string,
    { confirmationStatus: string; err: unknown; slot: bigint }
  >();

  return {
    getAccountInfo(address: Address) {
      return sendable(() => {
        const account = svm.getAccount(address);
        if (!account.exists) {
          return { context: { slot: svm.getClock().slot }, value: null };
        }
        const decoded = decodeToken({
          address,
          data: account.data,
          executable: account.executable,
          lamports: account.lamports,
          programAddress: account.programAddress,
          space: account.space,
        } satisfies EncodedAccount);
        return {
          context: { slot: svm.getClock().slot },
          value: {
            data: {
              parsed: {
                info: {
                  mint: decoded.data.mint,
                  owner: decoded.data.owner,
                  tokenAmount: {
                    amount: decoded.data.amount.toString(),
                  },
                },
              },
            },
          },
        };
      });
    },
    getLatestBlockhash() {
      return sendable(() => ({
        value: {
          blockhash: svm.latestBlockhash(),
          lastValidBlockHeight: svm.getClock().slot + 1_000n,
        },
      }));
    },
    getSignatureStatuses(signatures: string[]) {
      return sendable(() => ({
        value: signatures.map(
          (signature) =>
            signatureStatuses.get(signature) ?? {
              confirmationStatus: undefined,
              err: null,
              slot: undefined,
            },
        ),
      }));
    },
    getSignaturesForAddress(address: Address, options?: { before?: string; limit?: number }) {
      return sendable(() => {
        const signatures = signaturesByAddress.get(address) ?? [];
        const start = options?.before ? signatures.indexOf(options.before) + 1 : 0;
        return signatures.slice(start, start + (options?.limit ?? 20)).map((signature) => ({
          signature,
        }));
      });
    },
    getTransaction(signature: string) {
      return sendable(() => transactions.get(signature) ?? null);
    },
    sendTransaction(wireTransaction: string) {
      return sendable(() => {
        const transaction = getTransactionDecoder().decode(Buffer.from(wireTransaction, "base64"));
        const result = svm.sendTransaction(transaction);
        const signature = isFailedTransaction(result)
          ? getBase58Decoder().decode(result.meta().signature())
          : getBase58Decoder().decode(result.signature());
        const slot = svm.getClock().slot;

        if (isFailedTransaction(result)) {
          signatureStatuses.set(signature, {
            confirmationStatus: "confirmed",
            err: result.err().toString(),
            slot,
          });
          throw new Error(result.toString());
        }

        const parsedTransaction = parseTransactionForRpc(transaction, signature, slot);
        transactions.set(signature, parsedTransaction);
        signatureStatuses.set(signature, { confirmationStatus: "confirmed", err: null, slot });
        for (const address of parsedTransaction.addresses) {
          const existing = signaturesByAddress.get(address) ?? [];
          signaturesByAddress.set(address, [signature, ...existing]);
        }
        svm.warpToSlot(slot + 1n);
        return signature;
      });
    },
  };
}

function parseTransactionForRpc(
  transaction: Transaction,
  signature: string,
  slot: bigint,
): ParsedTransaction {
  const compiled = getCompiledTransactionMessageDecoder().decode(transaction.messageBytes);
  const message = decompileTransactionMessage(compiled as never);
  const instructions: unknown[] = [];
  const addresses = new Set<string>();

  for (const instruction of message.instructions) {
    if (instruction.programAddress === TOKEN_PROGRAM_ADDRESS) {
      try {
        const parsed = parseTransferCheckedInstruction(instruction as never);
        const source = parsed.accounts.source.address;
        const mint = parsed.accounts.mint.address;
        const destination = parsed.accounts.destination.address;
        addresses.add(source);
        addresses.add(destination);
        instructions.push({
          program: "spl-token",
          parsed: {
            type: "transferChecked",
            info: {
              source,
              mint,
              destination,
              tokenAmount: {
                amount: parsed.data.amount.toString(),
                decimals: parsed.data.decimals,
              },
            },
          },
        });
        continue;
      } catch {
        // Non-transfer token instructions are not relevant to payment verification.
      }
    }

    try {
      const parsedMemo = parseAddMemoInstruction(instruction as never);
      instructions.push({ program: "spl-memo", parsed: parsedMemo.data.memo });
    } catch {
      instructions.push(instruction);
    }
  }

  return {
    signature,
    slot,
    transaction: {
      message: {
        instructions,
      },
    },
    addresses,
  };
}

function sendable<T>(fn: () => T): RpcSendable<T> {
  return {
    async send() {
      return fn();
    },
  };
}

function isFailedTransaction(value: unknown): value is {
  err(): { toString(): string };
  meta(): { signature(): Uint8Array };
  toString(): string;
} {
  return typeof value === "object" && value !== null && "err" in value;
}

type ParsedTransaction = {
  addresses: Set<string>;
  signature: string;
  slot: bigint;
  transaction: {
    message: {
      instructions: unknown[];
    };
  };
};

type LiteSvmRpc = {
  getAccountInfo(address: Address): RpcSendable<unknown>;
  getLatestBlockhash(): RpcSendable<unknown>;
  getSignatureStatuses(signatures: string[]): RpcSendable<unknown>;
  getSignaturesForAddress(
    address: Address,
    options?: { before?: string; limit?: number },
  ): RpcSendable<unknown>;
  getTransaction(signature: string): RpcSendable<unknown>;
  sendTransaction(wireTransaction: string): RpcSendable<string>;
};

type RpcSendable<T> = {
  send(): Promise<T>;
};
