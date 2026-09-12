import { describe, expect, it } from "vite-plus/test";

import { isRetryableRpcError, SolanaPaymentsError, SolanaUsdtError } from "../src/index.js";

describe("errors", () => {
  it("preserves structured Solana USDT error metadata", () => {
    const error = new SolanaPaymentsError({
      code: "TRANSACTION_FAILED",
      message: "failed",
      signature: "sig",
      slot: 10,
      logs: ["log"],
    });
    expect(error.code).toBe("TRANSACTION_FAILED");
    expect(error.signature).toBe("sig");
    expect(error.slot).toBe(10n);
    expect(error.logs).toEqual(["log"]);
    expect(error.name).toBe("SolanaPaymentsError");
    expect(error).toBeInstanceOf(SolanaUsdtError);
  });

  it("detects retryable RPC failures", () => {
    expect(isRetryableRpcError(new Error("429 rate limit"))).toBe(true);
    expect(isRetryableRpcError(new Error("validation failed"))).toBe(false);
  });
});
