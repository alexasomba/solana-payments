import { SolanaPaymentsError } from "./errors.js";
import { callRpc, getPath, requireRpcMethod } from "./rpc.js";
import type {
  ClientContext,
  TransactionRetrieveInput,
  TransactionStatus,
  TransactionWaitInput,
} from "./types.js";

export function createTransactionsModule(ctx: ClientContext) {
  return {
    async retrieve(input: TransactionRetrieveInput): Promise<TransactionStatus> {
      return retrieveTransaction(ctx, input.signature);
    },

    async wait(input: TransactionWaitInput): Promise<TransactionStatus> {
      return waitForTransaction(ctx, input);
    },
  };
}

export async function retrieveTransaction(
  ctx: ClientContext,
  signature: string,
): Promise<TransactionStatus> {
  const getSignatureStatuses = requireRpcMethod(ctx, "getSignatureStatuses");
  const statuses = await callRpc<unknown>(ctx, "getSignatureStatuses", () =>
    getSignatureStatuses.call(ctx.rpc, [signature], { searchTransactionHistory: true }).send(),
  );
  const status = Array.isArray(getPath(statuses, ["value"]))
    ? (getPath(statuses, ["value"]) as unknown[])[0]
    : undefined;

  let transaction: unknown;
  if (typeof ctx.rpc.getTransaction === "function") {
    transaction = await callRpc<unknown>(ctx, "getTransaction", () =>
      ctx.rpc.getTransaction!(signature, {
        commitment: ctx.commitment,
        encoding: "jsonParsed",
        maxSupportedTransactionVersion: 0,
      }).send(),
    );
  }

  return {
    signature,
    slot: readBigInt(status, "slot") ?? readBigInt(transaction, "slot"),
    confirmationStatus: readString(status, "confirmationStatus"),
    err:
      typeof status === "object" && status !== null
        ? (status as Record<string, unknown>).err
        : undefined,
    transaction,
  };
}

export async function waitForTransaction(
  ctx: ClientContext,
  input: TransactionWaitInput,
): Promise<TransactionStatus> {
  const timeoutMs = input.timeoutMs ?? ctx.timeoutMs ?? 60_000;
  const pollIntervalMs = input.pollIntervalMs ?? 750;
  const commitment = input.commitment ?? ctx.commitment;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() <= deadline) {
    const status = await retrieveTransaction(ctx, input.signature);
    if (status.err) {
      throw new SolanaPaymentsError({
        code: "TRANSACTION_FAILED",
        message: "Solana transaction failed.",
        signature: input.signature,
        slot: status.slot,
        meta: { err: status.err },
      });
    }
    if (
      status.confirmationStatus &&
      commitmentRank(status.confirmationStatus) >= commitmentRank(commitment)
    ) {
      return status;
    }
    await sleep(pollIntervalMs);
  }

  throw new SolanaPaymentsError({
    code: "TRANSACTION_TIMEOUT",
    message: `Timed out waiting for transaction confirmation after ${timeoutMs}ms.`,
    signature: input.signature,
    retryable: true,
  });
}

function commitmentRank(commitment: string): number {
  if (commitment === "finalized") return 3;
  if (commitment === "confirmed") return 2;
  if (commitment === "processed") return 1;
  return 0;
}

function readBigInt(value: unknown, key: string): bigint | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const raw = (value as Record<string, unknown>)[key];
  return typeof raw === "number" || typeof raw === "bigint" ? BigInt(raw) : undefined;
}

function readString(value: unknown, key: string): string | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const raw = (value as Record<string, unknown>)[key];
  return typeof raw === "string" ? raw : undefined;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
