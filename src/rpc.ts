import { normalizeError, SolanaPaymentsError } from "./errors.js";
import { withRetry, withTimeout } from "./retry.js";
import type { ClientContext } from "./types.js";

export async function callRpc<T>(
  ctx: ClientContext,
  endpoint: string,
  fn: () => Promise<T>,
): Promise<T> {
  try {
    return await withRetry(() => withTimeout(fn(), ctx.timeoutMs, endpoint), ctx.retry);
  } catch (error) {
    throw normalizeError(error, {
      code: "RPC_ERROR",
      message: `Solana RPC request failed: ${endpoint}`,
      endpoint,
      retryable: true,
    });
  }
}

export function requireRpcMethod<T extends keyof ClientContext["rpc"]>(
  ctx: ClientContext,
  method: T,
): NonNullable<ClientContext["rpc"][T]> {
  const rpcMethod = ctx.rpc[method];
  if (typeof rpcMethod !== "function") {
    throw new SolanaPaymentsError({
      code: "RPC_ERROR",
      message: `Configured RPC client does not implement ${String(method)}.`,
      endpoint: String(method),
      retryable: false,
    });
  }
  return rpcMethod as NonNullable<ClientContext["rpc"][T]>;
}

export function readContextSlot(response: unknown): bigint | undefined {
  const slot = getPath(response, ["context", "slot"]);
  return typeof slot === "number" || typeof slot === "bigint" ? BigInt(slot) : undefined;
}

export function getPath(value: unknown, path: readonly string[]): unknown {
  let current = value;
  for (const key of path) {
    if (typeof current !== "object" || current === null || !(key in current)) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}
