import { describe, expect, it } from "vite-plus/test";

import {
  createMemo,
  createReference,
  MemoryIdempotencyStore,
  parseMemoReference,
} from "../src/index.js";

describe("references and idempotency", () => {
  it("generates prefixed references", () => {
    expect(createReference()).toMatch(/^solana-usdt_/);
  });

  it("round-trips memo references", () => {
    const memo = createMemo("invoice_123");
    expect(memo).toBe("solana-usdt:invoice_123");
    expect(parseMemoReference(memo)).toBe("invoice_123");
  });

  it("round-trips custom memo prefixes", () => {
    const memo = createMemo("invoice_123", "custom-payments");

    expect(memo).toBe("custom-payments:invoice_123");
    expect(parseMemoReference(memo, "custom-payments")).toBe("invoice_123");
    expect(parseMemoReference(memo)).toBeUndefined();
  });

  it("stores idempotency records in memory", async () => {
    const store = new MemoryIdempotencyStore<{ ok: true }>();
    store.set("key", {
      key: "key",
      reference: "ref",
      result: { ok: true },
      createdAt: new Date(0).toISOString(),
    });
    expect(store.get("key")).toMatchObject({ reference: "ref" });
  });
});
