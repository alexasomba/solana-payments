import { address } from "@solana/kit";

import type { SolanaToken } from "./types.js";

export const SOLANA_USDT_MINT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";
export const SOLANA_USDT_DECIMALS = 6;
export const DEFAULT_COMMITMENT = "confirmed";
export const DEFAULT_REFERENCE_PREFIX = "solana-usdt";
export const DEFAULT_GENERIC_REFERENCE_PREFIX = "solana-payments";

export const SOLANA_USDT_MINT_ADDRESS = address(SOLANA_USDT_MINT);

export const SOLANA_USDT: SolanaToken = {
  mint: SOLANA_USDT_MINT,
  decimals: SOLANA_USDT_DECIMALS,
  symbol: "USDT",
  referencePrefix: DEFAULT_REFERENCE_PREFIX,
};
