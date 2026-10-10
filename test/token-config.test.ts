import { TOKEN_2022_PROGRAM_ADDRESS } from "@solana-program/token-2022";
import { generateKeyPairSigner } from "@solana/kit";
import { describe, expect, it } from "vite-plus/test";

import { createContext } from "../src/context.js";
import { createSolanaPayments, SOLANA_USDT } from "../src/index.js";
import { getAssociatedTokenAddress, getTokenProgramAddress } from "../src/token.js";
import { buildTransferInstructions } from "../src/transfers.js";

describe("token configuration", () => {
  it("defaults the generic client to USDT", () => {
    const client = createSolanaPayments({
      rpcUrl: "http://localhost:8899",
      rpc: {},
    });

    const request = client.payments.createRequest({ amount: "1" });

    expect(request.mint).toBe(SOLANA_USDT.mint);
    expect(request.decimals).toBe(6);
    expect(request.memo).toMatch(/^solana-usdt:/);
  });

  it("uses a custom token and reference prefix", () => {
    const client = createSolanaPayments({
      rpcUrl: "http://localhost:8899",
      rpc: {},
      token: {
        mint: "So11111111111111111111111111111111111111112",
        decimals: 9,
        symbol: "CUSTOM",
        referencePrefix: "custom-payments",
      },
    });

    const request = client.payments.createRequest({ amount: "1" });

    expect(request.mint).toBe("So11111111111111111111111111111111111111112");
    expect(request.decimals).toBe(9);
    expect(request.memo).toMatch(/^custom-payments:/);
  });

  it("derives Token-2022 associated accounts and builds instructions for that program", async () => {
    const signer = await generateKeyPairSigner();
    const recipient = "11111111111111111111111111111111";
    const mint = "So11111111111111111111111111111111111111112";
    const legacyAta = await getAssociatedTokenAddress(signer.address, mint as never);
    const token2022Ata = await getAssociatedTokenAddress(
      signer.address,
      mint as never,
      "token-2022",
    );
    const ctx = createContext({
      rpcUrl: "http://localhost:8899",
      signer,
      rpc: {},
      token: { mint, decimals: 9, program: "token-2022" },
    });
    const instructions = await buildTransferInstructions(ctx, {
      amount: 1_000_000_000n,
      createRecipientAta: true,
      destinationOwner: recipient,
      destinationTokenAccount: token2022Ata,
      reference: "invoice_2023",
      sourceTokenAccount: token2022Ata,
    });

    expect(token2022Ata).not.toBe(legacyAta);
    expect(getTokenProgramAddress("token-2022")).toBe(TOKEN_2022_PROGRAM_ADDRESS);
    expect(instructions[0]?.accounts?.at(-1)?.address).toBe(TOKEN_2022_PROGRAM_ADDRESS);
    expect(instructions[1]?.programAddress).toBe(TOKEN_2022_PROGRAM_ADDRESS);
  });

  it("uses the configured prefix in transfer memo instructions", async () => {
    const signer = await generateKeyPairSigner();
    const ctx = createContext({
      rpcUrl: "http://localhost:8899",
      signer,
      rpc: {},
      token: {
        mint: "So11111111111111111111111111111111111111112",
        decimals: 9,
        referencePrefix: "custom-payments",
      },
    });

    const instructions = await buildTransferInstructions(ctx, {
      amount: 1_000_000_000n,
      createRecipientAta: false,
      destinationOwner: "11111111111111111111111111111111",
      destinationTokenAccount: "11111111111111111111111111111111",
      reference: "invoice_123",
      sourceTokenAccount: "11111111111111111111111111111111",
    });

    expect(new TextDecoder().decode(instructions.at(-1)?.data)).toBe("custom-payments:invoice_123");
  });

  it("rejects token decimals outside the supported range", () => {
    expect(() =>
      createSolanaPayments({
        rpcUrl: "http://localhost:8899",
        rpc: {},
        token: { mint: SOLANA_USDT.mint, decimals: 19 },
      }),
    ).toThrow("Token decimals must be an integer from 0 through 18.");
  });

  it("rejects an empty token reference prefix", () => {
    expect(() =>
      createSolanaPayments({
        rpcUrl: "http://localhost:8899",
        rpc: {},
        token: { mint: SOLANA_USDT.mint, decimals: 6, referencePrefix: "" },
      }),
    ).toThrow("Token reference prefix must not be empty.");
  });
});
