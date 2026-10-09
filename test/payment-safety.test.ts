import { address, getBase58Decoder, getAddressEncoder, generateKeyPairSigner } from "@solana/kit";
import { describe, expect, it } from "vite-plus/test";

import {
  createSolanaPayments,
  createReadOnlySolanaPayments,
  MemoryIdempotencyStore,
  SOLANA_USDT_MINT,
} from "../src/index.js";
import { getAssociatedTokenAddress } from "../src/token.js";
const sendable = <T>(value: T) => ({ send: async () => value });

describe("payment safety", () => {
  it.each(["signature", "reference"])("rejects failed transfers discovered by %s", async (mode) => {
    const recipient = await generateKeyPairSigner();
    const destination = await getAssociatedTokenAddress(
      recipient.address,
      address(SOLANA_USDT_MINT),
    );
    const err = { InstructionError: [1, "InsufficientFunds"] };
    const client = createReadOnlySolanaPayments({
      rpcUrl: "http://localhost:8899",
      rpc: {
        getSignatureStatuses: () =>
          sendable({ value: [{ slot: 55n, confirmationStatus: "confirmed", err }] }),
        getTransaction: () =>
          sendable({
            meta: { err },
            transaction: {
              message: {
                instructions: [
                  { program: "spl-memo", parsed: "solana-usdt:order" },
                  {
                    program: "spl-token",
                    parsed: {
                      type: "transferChecked",
                      info: {
                        mint: SOLANA_USDT_MINT,
                        destination,
                        tokenAmount: { amount: "1000000" },
                      },
                    },
                  },
                ],
              },
            },
          }),
        getSignaturesForAddress: () => sendable([{ signature: "failed", err }]),
      },
    });
    const result = await client.payments.verify({
      reference: "order",
      recipient: recipient.address,
      amount: "1",
      ...(mode === "signature" ? { signature: "failed" } : {}),
    });
    expect(result.found).toBe(false);
  });
  it("uses valid Solana Pay reference keys while preserving business memos", async () => {
    const recipient = await generateKeyPairSigner();
    const client = createReadOnlySolanaPayments({ rpcUrl: "http://localhost:8899", rpc: {} });
    const request = client.payments.createRequest({
      amount: "1",
      recipient: recipient.address,
      reference: "invoice-123",
    });
    const url = client.payments.toSolanaPayUrl(request);
    expect(getAddressEncoder().encode(url.searchParams.get("reference") as never)).toHaveLength(32);
    expect(url.searchParams.get("memo")).toBe("solana-usdt:invoice-123");
    expect(() => client.payments.toSolanaPayUrl(request, { reference: "uuid-invalid" })).toThrow();
  });
  it("serializes overlapping transfers with the same key before broadcasting", async () => {
    const signer = await generateKeyPairSigner(),
      recipient = await generateKeyPairSigner();
    let block = 0,
      broadcasts = 0;
    const client = createSolanaPayments({
      rpcUrl: "http://localhost:8899",
      signer,
      idempotencyStore: new MemoryIdempotencyStore(),
      rpc: {
        getLatestBlockhash: () =>
          sendable({
            value: {
              blockhash: getBase58Decoder().decode(new Uint8Array(32).fill(++block)),
              lastValidBlockHeight: 1000n,
            },
          }),
        sendTransaction: () => {
          broadcasts++;
          return sendable("sig");
        },
        getSignatureStatuses: () =>
          sendable({ value: [{ slot: 1n, confirmationStatus: "confirmed", err: null }] }),
      },
    });
    const results = await Promise.all([
      client.transfers.create({ to: recipient.address, amount: "1", idempotencyKey: "same" }),
      client.transfers.create({ to: recipient.address, amount: "1", idempotencyKey: "same" }),
    ]);
    expect(broadcasts).toBe(1);
    expect(results[0]).toEqual(results[1]);
  });
  it("persists signed bytes before an ambiguous broadcast and reuses them on retry", async () => {
    const signer = await generateKeyPairSigner(),
      recipient = await generateKeyPairSigner();
    const store = new MemoryIdempotencyStore<import("../src/types.js").TransferResult>();
    const broadcasts: string[] = [];
    let blockhashRequests = 0;
    const client = createSolanaPayments({
      rpcUrl: "http://localhost:8899",
      signer,
      idempotencyStore: store,
      retry: { retries: 0 },
      rpc: {
        getLatestBlockhash: () => {
          blockhashRequests++;
          return sendable({
            value: {
              blockhash: getBase58Decoder().decode(new Uint8Array(32).fill(1)),
              lastValidBlockHeight: 1000n,
            },
          });
        },
        sendTransaction: (wire: string) => ({
          send: async () => {
            broadcasts.push(wire);
            const record = store.get("retry");
            expect(record?.wireTransaction).toBe(wire);
            if (broadcasts.length === 1) throw new Error("RPC timeout after acceptance");
            return "sig";
          },
        }),
        getSignatureStatuses: () =>
          sendable({ value: [{ slot: 1n, confirmationStatus: "confirmed", err: null }] }),
      },
    });
    const input = { to: recipient.address, amount: "1", idempotencyKey: "retry" };
    await expect(client.transfers.create(input)).rejects.toThrow();
    await client.transfers.create(input);
    expect(broadcasts).toHaveLength(2);
    expect(broadcasts[0]).toBe(broadcasts[1]);
    expect(blockhashRequests).toBe(1);
    const anotherNetwork = createSolanaPayments({
      rpcUrl: "http://localhost:9999",
      signer,
      idempotencyStore: store,
      retry: { retries: 0 },
      rpc: {},
    });
    await expect(anotherNetwork.transfers.create(input)).rejects.toMatchObject({
      code: "IDEMPOTENCY_CONFLICT",
    });
    const anotherSource = createSolanaPayments({
      rpcUrl: "http://localhost:8899",
      signer: await generateKeyPairSigner(),
      idempotencyStore: store,
      retry: { retries: 0 },
      rpc: {},
    });
    await expect(anotherSource.transfers.create(input)).rejects.toMatchObject({
      code: "IDEMPOTENCY_CONFLICT",
    });
  });
});
