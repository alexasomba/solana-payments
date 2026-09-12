import { generateKeyPairSigner } from "@solana/kit";
import { describe, expect, it } from "vite-plus/test";

import { createSolanaUsdt, MemoryIdempotencyStore, type TransferResult } from "../src/index.js";

function sendable<T>(value: T) {
  return { send: async () => value };
}

describe("createSolanaUsdt", () => {
  it("retrieves zero balance for a missing associated token account", async () => {
    const signer = await generateKeyPairSigner();
    const client = createSolanaUsdt({
      rpcUrl: "http://localhost:8899",
      signer,
      rpc: {
        getAccountInfo: () => sendable({ context: { slot: 123 }, value: null }),
      },
    });

    const balance = await client.balances.retrieve({ owner: signer.address });
    expect(balance.amount).toBe(0n);
    expect(balance.displayAmount).toBe("0");
    expect(balance.slot).toBe(123n);
  });

  it("quotes ATA creation for recipients without token accounts", async () => {
    const signer = await generateKeyPairSigner();
    const recipient = await generateKeyPairSigner();
    const client = createSolanaUsdt({
      rpcUrl: "http://localhost:8899",
      signer,
      rpc: {
        getAccountInfo: () => sendable({ context: { slot: 1 }, value: null }),
      },
    });

    const quote = await client.transfers.quote({ to: recipient.address, amount: "1.25" });
    expect(quote.amount).toBe(1_250_000n);
    expect(quote.willCreateRecipientAta).toBe(true);
    expect(quote.estimatedFeeLamports).toBeGreaterThan(5_000n);
  });

  it("keeps transfer APIs behind an explicit signer", async () => {
    const client = createSolanaUsdt({
      rpcUrl: "http://localhost:8899",
      rpc: {},
    });

    await expect(
      client.transfers.quote({ to: "11111111111111111111111111111111", amount: "1" }),
    ).rejects.toMatchObject({ code: "SIGNER_REQUIRED" });
  });

  it("returns an existing idempotent transfer result without resending", async () => {
    const signer = await generateKeyPairSigner();
    const recipient = await generateKeyPairSigner();
    const quoteClient = createSolanaUsdt({
      rpcUrl: "http://localhost:8899",
      signer,
      rpc: {
        getAccountInfo: () => sendable({ value: null }),
      },
    });
    const quote = await quoteClient.transfers.quote({ to: recipient.address, amount: "1" });
    const result: TransferResult = {
      signature: "sig",
      reference: "ref",
      idempotencyKey: "idem",
      mint: quote.mint,
      amount: 1_000_000n,
      displayAmount: "1",
      sourceTokenAccount: "source",
      destinationTokenAccount: quote.destinationTokenAccount,
    };
    const store = new MemoryIdempotencyStore<TransferResult>();
    store.set("idem", {
      key: "idem",
      reference: "ref",
      result,
      createdAt: new Date(0).toISOString(),
    });

    const client = createSolanaUsdt({
      rpcUrl: "http://localhost:8899",
      signer,
      idempotencyStore: store,
      rpc: {},
    });

    await expect(
      client.transfers.create({ to: recipient.address, amount: "1", idempotencyKey: "idem" }),
    ).resolves.toBe(result);
  });

  it("rejects idempotency key reuse for a different transfer", async () => {
    const signer = await generateKeyPairSigner();
    const recipient = await generateKeyPairSigner();
    const quoteClient = createSolanaUsdt({
      rpcUrl: "http://localhost:8899",
      signer,
      rpc: {
        getAccountInfo: () => sendable({ value: null }),
      },
    });
    const quote = await quoteClient.transfers.quote({ to: recipient.address, amount: "1" });
    const store = new MemoryIdempotencyStore<TransferResult>();
    store.set("idem", {
      key: "idem",
      reference: "ref",
      result: {
        signature: "sig",
        reference: "ref",
        idempotencyKey: "idem",
        mint: quote.mint,
        amount: 1_000_000n,
        displayAmount: "1",
        sourceTokenAccount: "source",
        destinationTokenAccount: quote.destinationTokenAccount,
      },
      createdAt: new Date(0).toISOString(),
    });

    const client = createSolanaUsdt({
      rpcUrl: "http://localhost:8899",
      signer,
      idempotencyStore: store,
      rpc: {},
    });

    await expect(
      client.transfers.create({ to: recipient.address, amount: "2", idempotencyKey: "idem" }),
    ).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
  });

  it("stores submitted transfers before confirmation to avoid duplicate retries", async () => {
    const signer = await generateKeyPairSigner();
    const recipient = await generateKeyPairSigner();
    const store = new MemoryIdempotencyStore<TransferResult>();
    let sendCount = 0;
    const client = createSolanaUsdt({
      rpcUrl: "http://localhost:8899",
      signer,
      timeoutMs: 1,
      idempotencyStore: store,
      rpc: {
        getLatestBlockhash: () =>
          sendable({
            value: {
              blockhash: "11111111111111111111111111111111",
              lastValidBlockHeight: 1,
            },
          }),
        sendTransaction: () => {
          sendCount += 1;
          return sendable("submittedSig");
        },
        getSignatureStatuses: () => sendable({ value: [null] }),
      },
    });

    await expect(
      client.transfers.create({ to: recipient.address, amount: "1", idempotencyKey: "idem" }),
    ).rejects.toMatchObject({ code: "TRANSACTION_TIMEOUT" });

    const existing = store.get("idem");
    expect(existing?.result.signature).toBe("submittedSig");
    expect(existing?.result.confirmationStatus).toBe("submitted");

    const replayed = await client.transfers.create({
      to: recipient.address,
      amount: "1",
      idempotencyKey: "idem",
    });
    expect(replayed.signature).toBe("submittedSig");
    expect(sendCount).toBe(1);
  });
});
