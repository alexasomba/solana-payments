import { generateKeyPairSigner } from "@solana/kit";
import { describe, expect, it, vi } from "vite-plus/test";

import {
  createReadOnlySolanaUsdt,
  createSolanaUsdt,
  SOLANA_USDT_MINT,
  toSolanaPayUrl,
} from "../src/index.js";

const RECIPIENT = "11111111111111111111111111111111";

function sendable<T>(value: T) {
  return { send: async () => value };
}

function paymentTransaction(input: {
  reference: string;
  destination: string;
  amount?: string | undefined;
  mint?: string | undefined;
  prefix?: string | undefined;
}) {
  return {
    transaction: {
      message: {
        instructions: [
          { program: "spl-memo", parsed: `${input.prefix ?? "solana-usdt"}:${input.reference}` },
          {
            parsed: {
              type: "transferChecked",
              info: {
                mint: input.mint ?? SOLANA_USDT_MINT,
                destination: input.destination,
                tokenAmount: { amount: input.amount ?? "12340000" },
              },
            },
          },
        ],
      },
    },
  };
}

describe("payments", () => {
  it("creates payment requests with memo references", async () => {
    const signer = await generateKeyPairSigner();
    const client = createSolanaUsdt({
      rpcUrl: "http://localhost:8899",
      signer,
      rpc: {},
    });

    const request = client.payments.createRequest({
      amount: "12.34",
      recipient: signer.address,
      reference: "invoice_123",
      metadata: { customer: "cus_1" },
    });

    expect(request.amount).toBe(12_340_000n);
    expect(request.memo).toBe("solana-usdt:invoice_123");
    expect(request.mint).toBe(SOLANA_USDT_MINT);
  });

  it("supports payment-only clients without WebCrypto key generation", async () => {
    const generateKey = vi.spyOn(globalThis.crypto.subtle, "generateKey").mockImplementation(() => {
      throw new Error("payment-only flows must not generate keypairs");
    });
    const client = createReadOnlySolanaUsdt({
      rpcUrl: "http://localhost:8899",
      rpc: {
        getSignaturesForAddress: () => sendable([]),
      },
    });

    const request = client.payments.createRequest({
      amount: "12.34",
      recipient: RECIPIENT,
      reference: "invoice_123",
    });
    const verified = await client.payments.verify({
      reference: request.reference,
      recipient: RECIPIENT,
    });

    expect(request.amount).toBe(12_340_000n);
    expect(verified.found).toBe(false);
    expect(generateKey).not.toHaveBeenCalled();
    generateKey.mockRestore();
  });

  it("builds canonical Solana Pay URLs from payment requests", () => {
    const client = createReadOnlySolanaUsdt({
      rpcUrl: "http://localhost:8899",
      rpc: {},
    });
    const request = client.payments.createRequest({
      amount: "12.340000",
      recipient: RECIPIENT,
      reference: "invoice 123/abc",
    });

    const url = client.payments.toSolanaPayUrl(request, {
      label: "Automatic Pallet",
      message: "Order #123",
    });
    const standaloneUrl = toSolanaPayUrl(request, { memo: "custom memo" });

    expect(url.protocol).toBe("solana:");
    expect(url.pathname).toBe(RECIPIENT);
    expect(url.searchParams.get("amount")).toBe("12.34");
    expect(url.searchParams.get("spl-token")).toBe(SOLANA_USDT_MINT);
    expect(url.searchParams.get("reference")).toBe("invoice 123/abc");
    expect(url.searchParams.get("memo")).toBe("solana-usdt:invoice 123/abc");
    expect(url.searchParams.get("label")).toBe("Automatic Pallet");
    expect(url.searchParams.get("message")).toBe("Order #123");
    expect(url.toString()).toContain("reference=invoice+123%2Fabc");
    expect(standaloneUrl.searchParams.get("memo")).toBe("custom memo");
  });

  it("verifies a payment by signature and memo reference", async () => {
    const signer = await generateKeyPairSigner();
    const tx = {
      transaction: {
        message: {
          instructions: [
            { program: "spl-memo", parsed: "solana-usdt:invoice_123" },
            {
              parsed: {
                type: "transferChecked",
                info: {
                  mint: SOLANA_USDT_MINT,
                  destination: "destAta",
                  tokenAmount: { amount: "12340000" },
                },
              },
            },
          ],
        },
      },
    };
    const client = createSolanaUsdt({
      rpcUrl: "http://localhost:8899",
      signer,
      rpc: {
        getSignatureStatuses: () =>
          sendable({ value: [{ slot: 55, confirmationStatus: "confirmed", err: null }] }),
        getTransaction: () => sendable(tx),
      },
    });

    const verified = await client.payments.verify({
      signature: "sig",
      reference: "invoice_123",
      amount: "12.34",
    });
    expect(verified.found).toBe(true);
    expect(verified.reference).toBe("invoice_123");
    expect(verified.amount).toBe(12_340_000n);
    expect(verified.slot).toBe(55n);
  });

  it("verifies payment memos with the configured reference prefix", async () => {
    const client = createReadOnlySolanaUsdt({
      rpcUrl: "http://localhost:8899",
      token: {
        mint: "So11111111111111111111111111111111111111112",
        decimals: 9,
        referencePrefix: "custom-payments",
      },
      rpc: {
        getSignatureStatuses: () =>
          sendable({ value: [{ slot: 55, confirmationStatus: "confirmed", err: null }] }),
        getTransaction: () =>
          sendable(
            paymentTransaction({
              reference: "invoice_123",
              prefix: "custom-payments",
              destination: "destAta",
              amount: "12340000000",
              mint: "So11111111111111111111111111111111111111112",
            }),
          ),
      },
    });

    const verified = await client.payments.verify({
      signature: "sig",
      reference: "invoice_123",
      amount: "12.34",
    });

    expect(verified).toMatchObject({
      found: true,
      reference: "invoice_123",
      amount: 12_340_000_000n,
      memo: "custom-payments:invoice_123",
    });
  });

  it("verifies recipient wallets against their associated token account destination", async () => {
    const signer = await generateKeyPairSigner();
    const recipient = await generateKeyPairSigner();
    const quoteClient = createSolanaUsdt({
      rpcUrl: "http://localhost:8899",
      signer,
      rpc: {
        getAccountInfo: () => sendable({ value: null }),
      },
    });
    const quote = await quoteClient.transfers.quote({ to: recipient.address, amount: "12.34" });
    const tx = {
      transaction: {
        message: {
          instructions: [
            { program: "spl-memo", parsed: "solana-usdt:invoice_123" },
            {
              parsed: {
                type: "transferChecked",
                info: {
                  mint: SOLANA_USDT_MINT,
                  destination: quote.destinationTokenAccount,
                  tokenAmount: { amount: "12340000" },
                },
              },
            },
          ],
        },
      },
    };
    const client = createSolanaUsdt({
      rpcUrl: "http://localhost:8899",
      signer,
      rpc: {
        getSignatureStatuses: () =>
          sendable({ value: [{ slot: 55, confirmationStatus: "confirmed", err: null }] }),
        getTransaction: () => sendable(tx),
      },
    });

    const verified = await client.payments.verify({
      signature: "sig",
      reference: "invoice_123",
      recipient: recipient.address,
      amount: "12.34",
    });
    expect(verified.recipient).toBe(recipient.address);
    expect(verified.recipientTokenAccount).toBe(quote.destinationTokenAccount);
  });

  it("monitors the recipient associated token account rather than the wallet address", async () => {
    const signer = await generateKeyPairSigner();
    const recipient = await generateKeyPairSigner();
    const quoteClient = createSolanaUsdt({
      rpcUrl: "http://localhost:8899",
      signer,
      rpc: {
        getAccountInfo: () => sendable({ value: null }),
      },
    });
    const quote = await quoteClient.transfers.quote({ to: recipient.address, amount: "12.34" });
    let scannedAddress: unknown;
    const tx = {
      transaction: {
        message: {
          instructions: [
            { program: "spl-memo", parsed: "solana-usdt:invoice_123" },
            {
              parsed: {
                type: "transferChecked",
                info: {
                  mint: SOLANA_USDT_MINT,
                  destination: quote.destinationTokenAccount,
                  tokenAmount: { amount: "12340000" },
                },
              },
            },
          ],
        },
      },
    };
    const client = createSolanaUsdt({
      rpcUrl: "http://localhost:8899",
      signer,
      rpc: {
        getSignaturesForAddress: (address) => {
          scannedAddress = address;
          return sendable([{ signature: "sig" }]);
        },
        getSignatureStatuses: () =>
          sendable({ value: [{ slot: 55, confirmationStatus: "confirmed", err: null }] }),
        getTransaction: () => sendable(tx),
      },
    });

    const monitored = await client.payments.monitor({ recipient: recipient.address });
    expect(scannedAddress).toBe(quote.destinationTokenAccount);
    expect(monitored.payments).toHaveLength(1);
    expect(monitored.payments[0]?.recipient).toBe(recipient.address);
    expect(monitored.payments[0]?.recipientTokenAccount).toBe(quote.destinationTokenAccount);
  });

  it("paginates reference verification beyond the first scan page", async () => {
    const calls: Array<{ before?: unknown; limit?: unknown }> = [];
    let scannedTokenAccount = "";
    const client = createReadOnlySolanaUsdt({
      rpcUrl: "http://localhost:8899",
      rpc: {
        getSignaturesForAddress: (address: unknown, options: unknown) => {
          scannedTokenAccount = String(address);
          calls.push(options as { before?: unknown; limit?: unknown });
          return sendable([{ signature: calls.length === 1 ? "sig1" : "sig2" }]);
        },
        getSignatureStatuses: (signatures: unknown) => {
          const signature = Array.isArray(signatures) ? signatures[0] : undefined;
          return sendable({
            value: [
              {
                slot: signature === "sig2" ? 56 : 55,
                confirmationStatus: "confirmed",
                err: null,
              },
            ],
          });
        },
        getTransaction: (signature: unknown) =>
          sendable(
            paymentTransaction({
              reference: signature === "sig2" ? "invoice_123" : "invoice_other",
              destination: scannedTokenAccount,
            }),
          ),
      },
    });

    const verified = await client.payments.verify({
      reference: "invoice_123",
      recipient: RECIPIENT,
      amount: "12.34",
      limit: 1,
      maxPages: 2,
    });

    expect(verified.found).toBe(true);
    expect(verified.reference).toBe("invoice_123");
    expect(verified.amount).toBe(12_340_000n);
    expect(verified.scan).toMatchObject({
      pagesScanned: 2,
      signaturesScanned: 2,
      limit: 1,
      cursor: "sig2",
      hasMore: true,
    });
    expect(calls).toMatchObject([{ limit: 1 }, { before: "sig1", limit: 1 }]);
  });

  it("returns bounded scan diagnostics when reference verification does not find a match", async () => {
    let scannedTokenAccount = "";
    const client = createReadOnlySolanaUsdt({
      rpcUrl: "http://localhost:8899",
      rpc: {
        getSignaturesForAddress: (address: unknown) => {
          scannedTokenAccount = String(address);
          return sendable([{ signature: "sig1" }]);
        },
        getSignatureStatuses: () =>
          sendable({ value: [{ slot: 55, confirmationStatus: "confirmed", err: null }] }),
        getTransaction: () =>
          sendable(
            paymentTransaction({
              reference: "invoice_other",
              destination: scannedTokenAccount,
            }),
          ),
      },
    });

    const verified = await client.payments.verify({
      reference: "invoice_123",
      recipient: RECIPIENT,
      limit: 1,
      maxPages: 1,
    });

    expect(verified).toMatchObject({
      found: false,
      reference: "invoice_123",
      scan: {
        pagesScanned: 1,
        signaturesScanned: 1,
        limit: 1,
        cursor: "sig1",
        hasMore: true,
      },
    });
  });
});
