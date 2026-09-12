import { describe, expect, it } from "vite-plus/test";

import {
  createReadOnlySolanaPayments,
  createReadOnlySolanaUsdt,
  createSolanaPayments,
  createSolanaUsdt,
  SolanaPaymentsError,
  SolanaUsdtError,
} from "../src/index.js";

describe("generic API compatibility", () => {
  it("exposes transfer and payment methods from the canonical factories", () => {
    const client = createSolanaPayments({ rpcUrl: "http://localhost:8899", rpc: {} });
    const readOnlyClient = createReadOnlySolanaPayments({
      rpcUrl: "http://localhost:8899",
      rpc: {},
    });

    expect(Object.hasOwn(client.transfers, "quote")).toBe(true);
    expect(Object.hasOwn(client.payments, "createRequest")).toBe(true);
    expect(Object.hasOwn(readOnlyClient.payments, "verify")).toBe(true);
  });

  it("keeps USDT factory and error aliases compatible", () => {
    const client = createSolanaUsdt({ rpcUrl: "http://localhost:8899", rpc: {} });
    const readOnlyClient = createReadOnlySolanaUsdt({
      rpcUrl: "http://localhost:8899",
      rpc: {},
    });

    expect(Object.hasOwn(client.payments, "createRequest")).toBe(true);
    expect(Object.hasOwn(readOnlyClient.payments, "verify")).toBe(true);
    expect(SolanaUsdtError).toBe(SolanaPaymentsError);
  });
});
