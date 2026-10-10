import { getAddMemoInstruction, LEGACY_MEMO_PROGRAM_ADDRESS_V3 } from "@solana-program/memo";
import {
  getCreateAssociatedTokenIdempotentInstruction,
  getTransferCheckedInstruction,
} from "@solana-program/token";
import { getTransferCheckedInstruction as getTransferCheckedInstruction2022 } from "@solana-program/token-2022";
import {
  appendTransactionMessageInstructions,
  createTransactionMessage,
  getBase64EncodedWireTransaction,
  getSignatureFromTransaction,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
  type Instruction,
} from "@solana/kit";

import { formatTokenAmount, parseTokenAmount } from "./amounts.js";
import { normalizeAddress, requireSigner } from "./context.js";
import { SolanaPaymentsError } from "./errors.js";
import { createMemo, createReference } from "./idempotency.js";
import { callRpc, getPath, requireRpcMethod } from "./rpc.js";
import {
  getAssociatedTokenAddress,
  getTokenAccountAmount,
  getTokenProgramAddress,
} from "./token.js";
import { waitForTransaction } from "./transactions.js";
import type {
  ClientContext,
  TransferCreateInput,
  TransferQuote,
  TransferQuoteInput,
  TransferResult,
} from "./types.js";

const APPROX_SIGNATURE_FEE_LAMPORTS = 5_000n;
const APPROX_ATA_RENT_LAMPORTS = 2_039_280n;

export function createTransfersModule(ctx: ClientContext) {
  return {
    async quote(input: TransferQuoteInput): Promise<TransferQuote> {
      const signer = requireSigner(ctx, "transfers.quote");
      const destinationOwner = normalizeAddress(input.to, "recipient");
      const amount = parseTokenAmount(input.amount, ctx.decimals);
      const sourceTokenAccount = await getAssociatedTokenAddress(
        signer.address,
        ctx.mint,
        ctx.tokenProgram,
      );
      const destinationTokenAccount = await getAssociatedTokenAddress(
        destinationOwner,
        ctx.mint,
        ctx.tokenProgram,
      );
      const destination = await getTokenAccountAmount(ctx, destinationTokenAccount);
      const willCreateRecipientAta = !destination.exists;

      return {
        to: destinationOwner,
        mint: ctx.mint,
        amount,
        displayAmount: formatTokenAmount(amount, ctx.decimals),
        sourceTokenAccount,
        destinationTokenAccount,
        recipientAtaExists: destination.exists,
        willCreateRecipientAta,
        estimatedFeeLamports:
          APPROX_SIGNATURE_FEE_LAMPORTS + (willCreateRecipientAta ? APPROX_ATA_RENT_LAMPORTS : 0n),
        feeEstimateType: "approximate",
      };
    },

    async create(input: TransferCreateInput): Promise<TransferResult> {
      return createTransfer(ctx, input);
    },
  };
}

export async function createTransfer(
  ctx: ClientContext,
  input: TransferCreateInput,
): Promise<TransferResult> {
  if (input.idempotencyKey) {
    const store = ctx.idempotencyStore;
    if (!store?.withLock)
      throw new SolanaPaymentsError({
        code: "INVALID_INPUT",
        message: "Idempotent transfers require a store with an atomic withLock implementation.",
      });
    return store.withLock(input.idempotencyKey, () => createTransferLocked(ctx, input));
  }
  return createTransferLocked(ctx, input);
}

async function createTransferLocked(
  ctx: ClientContext,
  input: TransferCreateInput,
): Promise<TransferResult> {
  const signer = requireSigner(ctx, "transfers.create");
  const reference = input.reference ?? input.idempotencyKey ?? createReference(ctx.referencePrefix);
  const destinationOwner = normalizeAddress(input.to, "recipient");
  const amount = parseTokenAmount(input.amount, ctx.decimals);
  const sourceTokenAccount = await getAssociatedTokenAddress(
    signer.address,
    ctx.mint,
    ctx.tokenProgram,
  );
  const destinationTokenAccount = await getAssociatedTokenAddress(
    destinationOwner,
    ctx.mint,
    ctx.tokenProgram,
  );

  if (input.idempotencyKey && ctx.idempotencyStore) {
    const existing = await ctx.idempotencyStore.get(input.idempotencyKey);
    if (existing) {
      assertIdempotentReplay(existing.result, {
        amount,
        destinationTokenAccount,
        mint: ctx.mint,
        sourceTokenAccount,
      });
      if (existing.rpcUrl !== undefined && existing.rpcUrl !== ctx.rpcUrl)
        throw new SolanaPaymentsError({
          code: "IDEMPOTENCY_CONFLICT",
          message: "Idempotency key belongs to another RPC network.",
        });
      if (existing.result.confirmationStatus === "signed" && existing.wireTransaction) {
        const signature = await broadcast(ctx, existing.wireTransaction);
        const submitted = { ...existing.result, signature, confirmationStatus: "submitted" };
        await storeIdempotencyResult(
          ctx,
          input.idempotencyKey,
          reference,
          submitted,
          existing.wireTransaction,
        );
        const status = await waitForTransaction(ctx, { signature });
        const result = {
          ...submitted,
          slot: status.slot,
          confirmationStatus: status.confirmationStatus,
        };
        await storeIdempotencyResult(
          ctx,
          input.idempotencyKey,
          reference,
          result,
          existing.wireTransaction,
        );
        return result;
      }
      return existing.result;
    }
  }

  const instructions = await buildTransferInstructions(ctx, {
    amount,
    destinationOwner,
    destinationTokenAccount,
    reference,
    sourceTokenAccount,
    createRecipientAta: input.createRecipientAta ?? true,
  });

  const latestBlockhash = await getLatestBlockhash(ctx);
  const message = appendTransactionMessageInstructions(
    instructions,
    setTransactionMessageLifetimeUsingBlockhash(
      latestBlockhash,
      setTransactionMessageFeePayerSigner(signer, createTransactionMessage({ version: 0 })),
    ),
  );
  const signedTransaction = await signTransactionMessageWithSigners(message);
  const wireTransaction = getBase64EncodedWireTransaction(signedTransaction);
  const localSignature = getSignatureFromTransaction(signedTransaction);
  const submittedResult: TransferResult = {
    signature: localSignature,
    reference,
    idempotencyKey: input.idempotencyKey,
    mint: ctx.mint,
    amount,
    displayAmount: formatTokenAmount(amount, ctx.decimals),
    sourceTokenAccount,
    destinationTokenAccount,
    confirmationStatus: "signed",
  };

  if (input.idempotencyKey && ctx.idempotencyStore) {
    await storeIdempotencyResult(
      ctx,
      input.idempotencyKey,
      reference,
      submittedResult,
      wireTransaction,
    );
  }

  const signature = await broadcast(ctx, wireTransaction);
  submittedResult.signature = signature;
  submittedResult.confirmationStatus = "submitted";
  if (input.idempotencyKey && ctx.idempotencyStore)
    await storeIdempotencyResult(
      ctx,
      input.idempotencyKey,
      reference,
      submittedResult,
      wireTransaction,
    );
  const status = await waitForTransaction(ctx, { signature });
  const result: TransferResult = {
    ...submittedResult,
    slot: status.slot,
    confirmationStatus: status.confirmationStatus,
  };

  if (input.idempotencyKey && ctx.idempotencyStore) {
    await storeIdempotencyResult(ctx, input.idempotencyKey, reference, result);
  }

  return result;
}

async function storeIdempotencyResult(
  ctx: ClientContext,
  key: string,
  reference: string,
  result: TransferResult,
  wireTransaction?: string,
): Promise<void> {
  await ctx.idempotencyStore?.set(key, {
    key,
    reference,
    result,
    ...(wireTransaction ? { wireTransaction } : {}),
    rpcUrl: ctx.rpcUrl,
    createdAt: new Date().toISOString(),
  });
}

function assertIdempotentReplay(
  existing: TransferResult,
  expected: {
    amount: bigint;
    destinationTokenAccount: string;
    mint: string;
    sourceTokenAccount: string;
  },
): void {
  if (
    existing.amount !== expected.amount ||
    existing.destinationTokenAccount !== expected.destinationTokenAccount ||
    existing.mint !== expected.mint ||
    existing.sourceTokenAccount !== expected.sourceTokenAccount
  ) {
    throw new SolanaPaymentsError({
      code: "IDEMPOTENCY_CONFLICT",
      message: "Idempotency key was already used for a different transfer.",
      signature: existing.signature,
      meta: {
        existing: {
          amount: existing.amount.toString(),
          destinationTokenAccount: existing.destinationTokenAccount,
          mint: existing.mint,
        },
        requested: {
          amount: expected.amount.toString(),
          destinationTokenAccount: expected.destinationTokenAccount,
          mint: expected.mint,
        },
      },
    });
  }
}

export async function buildTransferInstructions(
  ctx: ClientContext,
  input: {
    amount: bigint;
    createRecipientAta: boolean;
    destinationOwner: string;
    destinationTokenAccount: string;
    reference: string;
    sourceTokenAccount: string;
  },
): Promise<Instruction[]> {
  const signer = requireSigner(ctx, "transfer instruction building");
  if (input.amount <= 0n) {
    throw new SolanaPaymentsError({
      code: "INVALID_AMOUNT",
      message: "Transfer amount must be greater than zero.",
    });
  }

  const instructions: Instruction[] = [];
  if (input.createRecipientAta) {
    instructions.push(
      getCreateAssociatedTokenIdempotentInstruction({
        payer: signer,
        ata: normalizeAddress(input.destinationTokenAccount, "destination token account"),
        owner: normalizeAddress(input.destinationOwner, "destination owner"),
        mint: ctx.mint,
        tokenProgram: getTokenProgramAddress(ctx.tokenProgram),
      }),
    );
  }

  const transferInput = {
    source: normalizeAddress(input.sourceTokenAccount, "source token account"),
    mint: ctx.mint,
    destination: normalizeAddress(input.destinationTokenAccount, "destination token account"),
    authority: signer,
    amount: input.amount,
    decimals: ctx.decimals,
  };
  instructions.push(
    ctx.tokenProgram === "token-2022"
      ? getTransferCheckedInstruction2022(transferInput)
      : getTransferCheckedInstruction(transferInput),
  );

  instructions.push(
    getAddMemoInstruction(
      { memo: createMemo(input.reference, ctx.referencePrefix) },
      { programAddress: LEGACY_MEMO_PROGRAM_ADDRESS_V3 },
    ),
  );
  return instructions;
}

async function getLatestBlockhash(
  ctx: ClientContext,
): Promise<{ blockhash: never; lastValidBlockHeight: bigint }> {
  const getLatestBlockhashRpc = requireRpcMethod(ctx, "getLatestBlockhash");
  const response = await callRpc<unknown>(ctx, "getLatestBlockhash", () =>
    getLatestBlockhashRpc.call(ctx.rpc, { commitment: ctx.commitment }).send(),
  );
  const value = getPath(response, ["value"]) ?? response;
  const blockhash = getPath(value, ["blockhash"]);
  const lastValidBlockHeight = getPath(value, ["lastValidBlockHeight"]);
  if (
    typeof blockhash !== "string" ||
    (typeof lastValidBlockHeight !== "number" && typeof lastValidBlockHeight !== "bigint")
  ) {
    throw new SolanaPaymentsError({
      code: "RPC_ERROR",
      message: "RPC getLatestBlockhash response did not include a blockhash lifetime.",
      endpoint: "getLatestBlockhash",
    });
  }
  return {
    blockhash: blockhash as never,
    lastValidBlockHeight: BigInt(lastValidBlockHeight),
  };
}

async function broadcast(ctx: ClientContext, wireTransaction: string): Promise<string> {
  const sendTransaction = requireRpcMethod(ctx, "sendTransaction");
  return String(
    await callRpc(ctx, "sendTransaction", () =>
      sendTransaction
        .call(ctx.rpc, wireTransaction, {
          encoding: "base64",
          preflightCommitment: ctx.commitment,
          maxRetries: ctx.retry?.retries,
        })
        .send(),
    ),
  );
}
