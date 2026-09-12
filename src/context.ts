import { address, createSolanaRpc, type Address, type TransactionSigner } from "@solana/kit";

import { DEFAULT_COMMITMENT, DEFAULT_GENERIC_REFERENCE_PREFIX, SOLANA_USDT } from "./constants.js";
import { SolanaPaymentsError } from "./errors.js";
import type { AddressInput, ClientContext, SolanaPaymentsClientOptions } from "./types.js";

export function createContext(options: SolanaPaymentsClientOptions): ClientContext {
  const token = options.token;
  const mintInput = token?.mint ?? options.mint ?? SOLANA_USDT.mint;
  const decimals = token?.decimals ?? options.decimals ?? SOLANA_USDT.decimals;
  const referencePrefix = token
    ? (token.referencePrefix ?? DEFAULT_GENERIC_REFERENCE_PREFIX)
    : (SOLANA_USDT.referencePrefix ?? DEFAULT_GENERIC_REFERENCE_PREFIX);
  validateDecimals(decimals);
  if (referencePrefix.length === 0) {
    throw new SolanaPaymentsError({
      code: "INVALID_INPUT",
      message: "Token reference prefix must not be empty.",
    });
  }
  const mint = normalizeAddress(mintInput);
  return {
    rpcUrl: options.rpcUrl,
    rpc:
      options.rpc ??
      (createSolanaRpc(
        options.rpcUrl as never,
        options.fetch ? ({ fetch: options.fetch } as never) : undefined,
      ) as never),
    signer: options.signer,
    commitment: options.commitment ?? DEFAULT_COMMITMENT,
    timeoutMs: options.timeoutMs,
    retry: options.retry,
    mint,
    decimals,
    referencePrefix,
    idempotencyStore: options.idempotencyStore,
  };
}

function validateDecimals(decimals: number): void {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) {
    throw new SolanaPaymentsError({
      code: "INVALID_INPUT",
      message: "Token decimals must be an integer from 0 through 18.",
    });
  }
}

export function normalizeAddress(value: AddressInput, field = "address"): Address {
  try {
    return typeof value === "string" ? address(value) : value;
  } catch (error) {
    throw new SolanaPaymentsError({
      code: "INVALID_ADDRESS",
      message: `Invalid Solana ${field}.`,
      cause: error,
    });
  }
}

export function requireSigner(ctx: ClientContext, operation: string): TransactionSigner {
  if (!ctx.signer) {
    throw new SolanaPaymentsError({
      code: "SIGNER_REQUIRED",
      message: `${operation} requires a TransactionSigner. Configure signer on createSolanaUsdt(...) before calling transfer APIs.`,
    });
  }
  return ctx.signer;
}
