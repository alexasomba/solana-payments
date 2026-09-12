import type { Address, TransactionSigner } from "@solana/kit";

import type { TokenAmountInput } from "./amounts.js";
import type { IdempotencyStore } from "./idempotency.js";
import type { RetryOptions } from "./retry.js";

export type Commitment = "processed" | "confirmed" | "finalized";
export type AddressInput = string | Address;

export interface SolanaToken {
  mint: AddressInput;
  decimals: number;
  symbol?: string;
  referencePrefix?: string;
}

export interface RpcSendable<T> {
  send(): Promise<T>;
}

export interface SolanaRpcLike {
  getAccountInfo?(...args: unknown[]): RpcSendable<unknown>;
  getFeeForMessage?(...args: unknown[]): RpcSendable<unknown>;
  getLatestBlockhash?(...args: unknown[]): RpcSendable<unknown>;
  getSignaturesForAddress?(...args: unknown[]): RpcSendable<unknown>;
  getSignatureStatuses?(...args: unknown[]): RpcSendable<unknown>;
  getTokenAccountsByOwner?(...args: unknown[]): RpcSendable<unknown>;
  getTransaction?(...args: unknown[]): RpcSendable<unknown>;
  sendTransaction?(...args: unknown[]): RpcSendable<unknown>;
}

export interface SolanaPaymentsClientOptions {
  rpcUrl: string;
  rpcSubscriptionsUrl?: string | undefined;
  signer?: TransactionSigner | undefined;
  commitment?: Commitment | undefined;
  fetch?: typeof fetch | undefined;
  timeoutMs?: number | undefined;
  retry?: RetryOptions | undefined;
  mint?: AddressInput | undefined;
  decimals?: number | undefined;
  token?: SolanaToken | undefined;
  idempotencyStore?: IdempotencyStore<TransferResult> | undefined;
  rpc?: SolanaRpcLike | undefined;
}

export type SolanaPaymentsReadOnlyClientOptions = Omit<
  SolanaPaymentsClientOptions,
  "signer" | "idempotencyStore"
>;

export type SolanaUsdtClientOptions = SolanaPaymentsClientOptions;
export type SolanaUsdtReadOnlyClientOptions = SolanaPaymentsReadOnlyClientOptions;

export interface ClientContext {
  rpcUrl: string;
  rpc: SolanaRpcLike;
  signer?: TransactionSigner | undefined;
  commitment: Commitment;
  timeoutMs?: number | undefined;
  retry?: RetryOptions | undefined;
  mint: Address;
  decimals: number;
  referencePrefix: string;
  idempotencyStore?: IdempotencyStore<TransferResult> | undefined;
}

export interface BalanceRetrieveInput {
  owner: AddressInput;
}

export interface BalanceResult {
  owner: string;
  mint: string;
  tokenAccount: string;
  amount: bigint;
  displayAmount: string;
  decimals: number;
  slot?: bigint | undefined;
}

export interface TransferQuoteInput {
  to: AddressInput;
  amount: TokenAmountInput;
}

export interface TransferQuote {
  to: string;
  mint: string;
  amount: bigint;
  displayAmount: string;
  sourceTokenAccount: string;
  destinationTokenAccount: string;
  recipientAtaExists: boolean;
  willCreateRecipientAta: boolean;
  estimatedFeeLamports: bigint;
  feeEstimateType: "approximate" | "rpc";
}

export interface TransferCreateInput {
  to: AddressInput;
  amount: TokenAmountInput;
  reference?: string | undefined;
  idempotencyKey?: string | undefined;
  createRecipientAta?: boolean | undefined;
}

export interface TransferResult {
  signature: string;
  reference: string;
  idempotencyKey?: string | undefined;
  mint: string;
  amount: bigint;
  displayAmount: string;
  sourceTokenAccount: string;
  destinationTokenAccount: string;
  feeLamports?: bigint | undefined;
  slot?: bigint | undefined;
  confirmationStatus?: string | undefined;
}

export interface PaymentCreateRequestInput {
  amount: TokenAmountInput;
  recipient?: AddressInput | undefined;
  reference?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export interface SolanaPayUrlOptions {
  recipient?: AddressInput | undefined;
  reference?: string | readonly string[] | undefined;
  memo?: string | undefined;
  label?: string | undefined;
  message?: string | undefined;
}

export interface PaymentRequest {
  reference: string;
  recipient?: string | undefined;
  mint: string;
  amount: bigint;
  displayAmount: string;
  decimals: number;
  memo: string;
  metadata?: Record<string, unknown> | undefined;
  createdAt: string;
}

export interface PaymentVerifyInput {
  reference?: string | undefined;
  signature?: string | undefined;
  recipient?: AddressInput | undefined;
  amount?: TokenAmountInput | undefined;
  cursor?: string | undefined;
  limit?: number | undefined;
  maxPages?: number | undefined;
}

export interface PaymentVerificationScanDiagnostics {
  pagesScanned: number;
  signaturesScanned: number;
  limit: number;
  cursor?: string | undefined;
  hasMore: boolean;
}

export interface VerifiedPayment {
  found: boolean;
  reference?: string | undefined;
  signature?: string | undefined;
  /** Expected recipient wallet owner when it was supplied to verification or monitoring. */
  recipient?: string | undefined;
  /** SPL token account that received the USDT transfer. */
  recipientTokenAccount?: string | undefined;
  amount?: bigint | undefined;
  displayAmount?: string | undefined;
  slot?: bigint | undefined;
  confirmationStatus?: string | undefined;
  memo?: string | undefined;
  scan?: PaymentVerificationScanDiagnostics | undefined;
}

export interface PaymentMonitorInput {
  recipient: AddressInput;
  cursor?: string | undefined;
  limit?: number | undefined;
}

export interface PaymentMonitorResult {
  cursor?: string | undefined;
  signaturesScanned: number;
  hasMore: boolean;
  payments: VerifiedPayment[];
}

export interface TransactionRetrieveInput {
  signature: string;
}

export interface TransactionWaitInput {
  signature: string;
  commitment?: Commitment | undefined;
  timeoutMs?: number | undefined;
  pollIntervalMs?: number | undefined;
}

export interface TransactionStatus {
  signature: string;
  slot?: bigint | undefined;
  confirmationStatus?: string | undefined;
  err?: unknown;
  transaction?: unknown;
}

export interface SolanaPaymentsClient {
  balances: {
    retrieve(input: BalanceRetrieveInput): Promise<BalanceResult>;
  };
  transfers: {
    quote(input: TransferQuoteInput): Promise<TransferQuote>;
    create(input: TransferCreateInput): Promise<TransferResult>;
  };
  payments: {
    createRequest(input: PaymentCreateRequestInput): PaymentRequest;
    toSolanaPayUrl(request: PaymentRequest, options?: SolanaPayUrlOptions): URL;
    verify(input: PaymentVerifyInput): Promise<VerifiedPayment>;
    monitor(input: PaymentMonitorInput): Promise<PaymentMonitorResult>;
  };
  transactions: {
    retrieve(input: TransactionRetrieveInput): Promise<TransactionStatus>;
    wait(input: TransactionWaitInput): Promise<TransactionStatus>;
  };
}

export type SolanaPaymentsReadOnlyClient = Pick<
  SolanaPaymentsClient,
  "balances" | "payments" | "transactions"
>;

/** @deprecated Use SolanaPaymentsClient instead. */
export type SolanaUsdtClient = SolanaPaymentsClient;
/** @deprecated Use SolanaPaymentsReadOnlyClient instead. */
export type SolanaUsdtReadOnlyClient = SolanaPaymentsReadOnlyClient;
