import { createHash } from "node:crypto";

import { getBase58Decoder } from "@solana/kit";

import { formatTokenAmount, parseTokenAmount } from "./amounts.js";
import { normalizeAddress } from "./context.js";
import { SolanaPaymentsError } from "./errors.js";
import { createMemo, createReference, parseMemoReference } from "./idempotency.js";
import { callRpc, getPath, requireRpcMethod } from "./rpc.js";
import { getAssociatedTokenAddress } from "./token.js";
import { retrieveTransaction } from "./transactions.js";
import type {
  ClientContext,
  PaymentCreateRequestInput,
  PaymentMonitorInput,
  PaymentMonitorResult,
  PaymentRequest,
  PaymentVerifyInput,
  PaymentVerificationScanDiagnostics,
  SolanaPayUrlOptions,
  VerifiedPayment,
} from "./types.js";

const DEFAULT_SIGNATURE_SCAN_LIMIT = 20;
const MAX_SIGNATURE_SCAN_LIMIT = 1_000;
const DEFAULT_VERIFY_MAX_PAGES = 1;
const MAX_VERIFY_PAGES = 100;

export function createPaymentsModule(ctx: ClientContext) {
  return {
    createRequest(input: PaymentCreateRequestInput): PaymentRequest {
      const amount = parseTokenAmount(input.amount, ctx.decimals);
      const reference = input.reference ?? createReference(ctx.referencePrefix);
      return {
        reference,
        solanaPayReference: referenceKey(reference),
        recipient: input.recipient ? normalizeAddress(input.recipient, "recipient") : undefined,
        mint: ctx.mint,
        amount,
        displayAmount: formatTokenAmount(amount, ctx.decimals),
        decimals: ctx.decimals,
        memo: createMemo(reference, ctx.referencePrefix),
        metadata: input.metadata,
        createdAt: new Date().toISOString(),
      };
    },

    toSolanaPayUrl(request: PaymentRequest, options?: SolanaPayUrlOptions): URL {
      return toSolanaPayUrl(request, options);
    },

    async verify(input: PaymentVerifyInput): Promise<VerifiedPayment> {
      if (!input.signature && !input.reference) {
        throw new SolanaPaymentsError({
          code: "PAYMENT_NOT_FOUND",
          message: "Provide either a transaction signature or memo reference to verify a payment.",
        });
      }
      if (input.signature) {
        const payment = await verifySignature(ctx, input.signature, input);
        if (payment) return payment;
      }
      if (input.reference && input.recipient) {
        return await verifyReference(ctx, {
          ...input,
          reference: input.reference,
          recipient: input.recipient,
        });
      }
      return { found: false, reference: input.reference, signature: input.signature };
    },

    async monitor(input: PaymentMonitorInput): Promise<PaymentMonitorResult> {
      return monitorPayments(ctx, input);
    },
  };
}

export function toSolanaPayUrl(request: PaymentRequest, options: SolanaPayUrlOptions = {}): URL {
  const recipient = options.recipient
    ? normalizeAddress(options.recipient, "recipient")
    : request.recipient;
  if (!recipient) {
    throw new SolanaPaymentsError({
      code: "INVALID_ADDRESS",
      message: "A payment request recipient is required to build a Solana Pay URL.",
    });
  }

  const url = new URL(`solana:${recipient}`);
  url.searchParams.set("amount", formatTokenAmount(request.amount, request.decimals));
  url.searchParams.set("spl-token", request.mint);

  const references = normalizeReferences(
    options.reference ?? request.solanaPayReference ?? referenceKey(request.reference),
  );
  for (const reference of references) {
    url.searchParams.append("reference", normalizeAddress(reference, "Solana Pay reference"));
  }

  const memo = options.memo ?? request.memo;
  if (memo) url.searchParams.set("memo", memo);
  if (options.label !== undefined) url.searchParams.set("label", options.label);
  if (options.message !== undefined) url.searchParams.set("message", options.message);
  return url;
}

async function verifySignature(
  ctx: ClientContext,
  signature: string,
  input: PaymentVerifyInput,
): Promise<VerifiedPayment | undefined> {
  const status = await retrieveTransaction(ctx, signature);
  if (!isSuccessfulPaymentStatus(ctx, status)) return undefined;
  const payment = extractVerifiedPayment(ctx, status.transaction, signature);
  if (!payment) return undefined;
  payment.slot = status.slot;
  payment.confirmationStatus = status.confirmationStatus;
  return assertExpectedPayment(ctx, payment, input);
}

async function verifyReference(
  ctx: ClientContext,
  input: PaymentVerifyInput & {
    reference: string;
    recipient: NonNullable<PaymentVerifyInput["recipient"]>;
  },
): Promise<VerifiedPayment> {
  const limit = normalizeSignatureScanLimit(input.limit);
  const maxPages = normalizeMaxPages(input.maxPages);
  let cursor = input.cursor;
  let pagesScanned = 0;
  let signaturesScanned = 0;
  let finalCursor: string | undefined;
  let hasMore = false;

  while (pagesScanned < maxPages) {
    const monitored = await monitorPayments(ctx, {
      recipient: input.recipient,
      limit,
      cursor,
    });
    pagesScanned += 1;
    signaturesScanned += monitored.signaturesScanned;
    finalCursor = monitored.cursor;
    hasMore = monitored.hasMore;

    const payment = monitored.payments.find((candidate) => candidate.reference === input.reference);
    if (payment) {
      const verified = await assertExpectedPayment(ctx, payment, input);
      return {
        ...verified,
        scan: createScanDiagnostics({
          pagesScanned,
          signaturesScanned,
          limit,
          finalCursor,
          hasMore,
        }),
      };
    }

    if (!monitored.hasMore || !monitored.cursor) break;
    cursor = monitored.cursor;
  }

  return {
    found: false,
    reference: input.reference,
    signature: input.signature,
    scan: createScanDiagnostics({ pagesScanned, signaturesScanned, limit, finalCursor, hasMore }),
  };
}

async function monitorPayments(
  ctx: ClientContext,
  input: PaymentMonitorInput,
): Promise<PaymentMonitorResult> {
  const limit = normalizeSignatureScanLimit(input.limit);
  const recipient = normalizeAddress(input.recipient, "recipient");
  const recipientTokenAccount = await getAssociatedTokenAddress(recipient, ctx.mint);
  const getSignaturesForAddress = requireRpcMethod(ctx, "getSignaturesForAddress");
  const signatures = await callRpc<unknown[]>(ctx, "getSignaturesForAddress", async () => {
    const response = await getSignaturesForAddress
      .call(ctx.rpc, recipientTokenAccount, {
        before: input.cursor,
        limit,
      })
      .send();
    return Array.isArray(response) ? response : [];
  });

  const payments: VerifiedPayment[] = [];
  for (const row of signatures) {
    const signature =
      typeof row === "object" && row !== null
        ? (row as Record<string, unknown>).signature
        : undefined;
    if (typeof signature !== "string") continue;
    const status = await retrieveTransaction(ctx, signature);
    if (!isSuccessfulPaymentStatus(ctx, status)) continue;
    const payment = extractVerifiedPayment(ctx, status.transaction, signature);
    if (payment?.recipientTokenAccount === recipientTokenAccount) {
      payment.recipient = recipient;
      payment.slot = status.slot;
      payment.confirmationStatus = status.confirmationStatus;
      payments.push(payment);
    }
  }

  const last = signatures.at(-1);
  const cursor =
    typeof last === "object" && last !== null
      ? (last as Record<string, unknown>).signature
      : undefined;
  const nextCursor = typeof cursor === "string" ? cursor : undefined;
  return {
    cursor: nextCursor,
    signaturesScanned: signatures.length,
    hasMore: signatures.length >= limit && nextCursor !== undefined,
    payments,
  };
}

async function assertExpectedPayment(
  ctx: ClientContext,
  payment: VerifiedPayment,
  input: PaymentVerifyInput,
): Promise<VerifiedPayment> {
  if (input.reference && payment.reference !== input.reference) {
    throw mismatch("Payment reference did not match.", payment);
  }
  if (input.amount !== undefined) {
    const expectedAmount = parseTokenAmount(input.amount, ctx.decimals);
    if (payment.amount !== expectedAmount) throw mismatch("Payment amount did not match.", payment);
  }
  if (input.recipient) {
    const recipient = normalizeAddress(input.recipient, "recipient");
    return await assertExpectedRecipient(ctx, payment, recipient);
  }
  return { ...payment, found: true };
}

async function assertExpectedRecipient(
  ctx: ClientContext,
  payment: VerifiedPayment,
  recipient: string,
): Promise<VerifiedPayment> {
  const recipientTokenAccount = await getAssociatedTokenAddress(
    normalizeAddress(recipient),
    ctx.mint,
  );
  if (payment.recipientTokenAccount === undefined) {
    throw mismatch("Payment recipient token account was not found.", payment);
  }
  if (payment.recipientTokenAccount !== recipientTokenAccount) {
    throw mismatch("Payment recipient token account did not match.", payment);
  }
  return {
    ...payment,
    found: true,
    recipient,
    recipientTokenAccount: payment.recipientTokenAccount ?? recipientTokenAccount,
  };
}

function extractVerifiedPayment(
  ctx: ClientContext,
  transactionResponse: unknown,
  signature: string,
): VerifiedPayment | undefined {
  if (getPath(transactionResponse, ["meta", "err"]) != null) return undefined;
  const tx = getPath(transactionResponse, ["transaction"]) ?? transactionResponse;
  const message = getPath(tx, ["message"]) ?? getPath(tx, ["transaction", "message"]);
  const instructions = getPath(message, ["instructions"]);
  if (!Array.isArray(instructions)) return undefined;

  let memo: string | undefined;
  let reference: string | undefined;
  let recipientTokenAccount: string | undefined;
  let amount: bigint | undefined;

  for (const instruction of instructions) {
    const parsedType = getPath(instruction, ["parsed", "type"]);
    const parsedInfo = getPath(instruction, ["parsed", "info"]);
    const program = getPath(instruction, ["program"]);
    if (program === "spl-memo") {
      const parsed = getPath(instruction, ["parsed"]);
      memo =
        typeof parsed === "string" ? parsed : typeof parsedInfo === "string" ? parsedInfo : memo;
      if (memo) reference = parseMemoReference(memo, ctx.referencePrefix) ?? reference;
    }
    if (parsedType === "transferChecked" && typeof parsedInfo === "object" && parsedInfo !== null) {
      const info = parsedInfo as Record<string, unknown>;
      if (info.mint === ctx.mint) {
        recipientTokenAccount =
          typeof info.destination === "string" ? info.destination : recipientTokenAccount;
        const rawAmount = getPath(info, ["tokenAmount", "amount"]) ?? info.amount;
        if (
          typeof rawAmount === "string" ||
          typeof rawAmount === "number" ||
          typeof rawAmount === "bigint"
        ) {
          amount = BigInt(rawAmount);
        }
      }
    }
  }

  if (!reference && amount === undefined) return undefined;
  return {
    found: true,
    signature,
    reference,
    recipientTokenAccount,
    amount,
    displayAmount: amount === undefined ? undefined : formatTokenAmount(amount, ctx.decimals),
    memo,
  };
}

function mismatch(message: string, payment: VerifiedPayment): SolanaPaymentsError {
  return new SolanaPaymentsError({
    code: "PAYMENT_MISMATCH",
    message,
    signature: payment.signature,
    slot: payment.slot,
    meta: { payment },
  });
}

function normalizeReferences(reference: string | readonly string[]): readonly string[] {
  return typeof reference === "string" ? [reference] : reference;
}

function normalizeSignatureScanLimit(limit: number | undefined): number {
  return normalizeBoundedInteger(limit, {
    defaultValue: DEFAULT_SIGNATURE_SCAN_LIMIT,
    field: "payment scan limit",
    max: MAX_SIGNATURE_SCAN_LIMIT,
  });
}

function normalizeMaxPages(maxPages: number | undefined): number {
  return normalizeBoundedInteger(maxPages, {
    defaultValue: DEFAULT_VERIFY_MAX_PAGES,
    field: "payment verify maxPages",
    max: MAX_VERIFY_PAGES,
  });
}

function normalizeBoundedInteger(
  value: number | undefined,
  options: { defaultValue: number; field: string; max: number },
): number {
  if (value === undefined) return options.defaultValue;
  if (!Number.isInteger(value) || value < 1 || value > options.max) {
    throw new SolanaPaymentsError({
      code: "INVALID_INPUT",
      message: `${options.field} must be an integer between 1 and ${options.max}.`,
    });
  }
  return value;
}

function createScanDiagnostics(input: {
  pagesScanned: number;
  signaturesScanned: number;
  limit: number;
  finalCursor?: string | undefined;
  hasMore: boolean;
}): PaymentVerificationScanDiagnostics {
  return {
    pagesScanned: input.pagesScanned,
    signaturesScanned: input.signaturesScanned,
    limit: input.limit,
    cursor: input.finalCursor,
    hasMore: input.hasMore,
  };
}

function referenceKey(reference: string): string {
  return getBase58Decoder().decode(createHash("sha256").update(reference).digest());
}

function isSuccessfulPaymentStatus(
  ctx: ClientContext,
  status: Awaited<ReturnType<typeof retrieveTransaction>>,
): boolean {
  const rank = (value: string | undefined) =>
    value === "finalized" ? 3 : value === "confirmed" ? 2 : value === "processed" ? 1 : 0;
  return (
    status.err == null &&
    getPath(status.transaction, ["meta", "err"]) == null &&
    rank(status.confirmationStatus) >= Math.max(2, rank(ctx.commitment))
  );
}
