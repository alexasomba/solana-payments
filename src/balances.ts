import { formatTokenAmount } from "./amounts.js";
import { normalizeAddress } from "./context.js";
import { getAssociatedTokenAddress, getTokenAccountAmount } from "./token.js";
import type { BalanceRetrieveInput, BalanceResult, ClientContext } from "./types.js";

export function createBalancesModule(ctx: ClientContext) {
  return {
    async retrieve(input: BalanceRetrieveInput): Promise<BalanceResult> {
      const owner = normalizeAddress(input.owner, "owner");
      const tokenAccount = await getAssociatedTokenAddress(owner, ctx.mint, ctx.tokenProgram);
      const account = await getTokenAccountAmount(ctx, tokenAccount);

      return {
        owner,
        mint: ctx.mint,
        tokenAccount,
        amount: account.amount,
        displayAmount: formatTokenAmount(account.amount, ctx.decimals),
        decimals: ctx.decimals,
        slot: account.slot,
      };
    },
  };
}
