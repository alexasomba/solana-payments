import { findAssociatedTokenPda, TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";
import type { Address } from "@solana/kit";

import { callRpc, getPath, readContextSlot, requireRpcMethod } from "./rpc.js";
import type { ClientContext } from "./types.js";

export async function getAssociatedTokenAddress(owner: Address, mint: Address): Promise<Address> {
  const [ata] = await findAssociatedTokenPda({
    owner,
    mint,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  });
  return ata;
}

export async function getTokenAccountAmount(
  ctx: ClientContext,
  tokenAccount: Address,
): Promise<{
  exists: boolean;
  amount: bigint;
  slot?: bigint | undefined;
}> {
  const getAccountInfo = requireRpcMethod(ctx, "getAccountInfo");
  const response = await callRpc<unknown>(ctx, "getAccountInfo", () =>
    getAccountInfo
      .call(ctx.rpc, tokenAccount, {
        commitment: ctx.commitment,
        encoding: "jsonParsed",
      })
      .send(),
  );
  const value = getPath(response, ["value"]);
  if (value === null || value === undefined) {
    return { exists: false, amount: 0n, slot: readContextSlot(response) };
  }
  const amount = getPath(value, ["data", "parsed", "info", "tokenAmount", "amount"]);
  return {
    exists: true,
    amount:
      typeof amount === "string" || typeof amount === "number" || typeof amount === "bigint"
        ? BigInt(amount)
        : 0n,
    slot: readContextSlot(response),
  };
}
