import { describe, expect, it } from "vite-plus/test";

import {
  formatTokenAmount,
  parseTokenAmount,
  SOLANA_USDT_DECIMALS,
  SOLANA_USDT_MINT,
} from "../src/index.js";

describe("amount helpers", () => {
  it("exports the official Solana USDT mint and decimals", () => {
    expect(SOLANA_USDT_MINT).toBe("Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB");
    expect(SOLANA_USDT_DECIMALS).toBe(6);
  });

  it("parses decimal amounts into base units", () => {
    expect(parseTokenAmount("10.50", 6)).toBe(10_500_000n);
    expect(parseTokenAmount("0.000001", 6)).toBe(1n);
    expect(parseTokenAmount(2, 6)).toBe(2_000_000n);
  });

  it("formats base units into trimmed decimal strings", () => {
    expect(formatTokenAmount(10_500_000n, 6)).toBe("10.5");
    expect(formatTokenAmount(1n, 6)).toBe("0.000001");
  });

  it("rejects overly precise amounts", () => {
    expect(() => parseTokenAmount("0.0000001", 6)).toThrow(/more than 6/);
  });
});
