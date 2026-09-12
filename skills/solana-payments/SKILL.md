---
name: solana-payments
description: Guidelines and code examples for using the solana-payments library to manage SPL-token balances, create transfers, and handle payments on Solana. Use this skill when the user asks to integrate, configure, or troubleshoot the solana-payments client, fetch token balances, build or simulate token transfers, create payment requests, verify transactions, or poll for confirmations. The library leverages the new @solana/kit and @solana-program/token.
user-invocable: true
license: MIT
compatibility: Requires Node.js 22+, typescript
metadata:
  author: alexasomba
  version: 0.4.2 # x-release-please-version
---

# Solana Payments SDK Skill

A developer-friendly SDK for SPL-token balance retrieval, transfer quotes, payments, and transaction verification on Solana, built on top of the modern `@solana/kit` and `@solana-program/token`. It defaults to the `SOLANA_USDT` preset while allowing custom token configuration.

## Migration from `solana-usdt`

Install `solana-payments` and use the generic API names. `createSolanaUsdt` and `createReadOnlySolanaUsdt` remain deprecated compatibility aliases, and the `SOLANA_USDT` preset preserves the existing `solana-usdt:` memo prefix.

## Core Features & Usage

### 1. Client Instantiation

Import `SOLANA_USDT` and `createSolanaPayments` and configure the client with an RPC URL. Add a real `TransactionSigner` from `@solana/kit` only when the app will quote or create transfers.

```typescript
import { SOLANA_USDT, createSolanaPayments, generateKeyPairSigner } from "solana-payments";

const signer = await generateKeyPairSigner();
const client = createSolanaPayments({
  rpcUrl: "https://api.devnet.solana.com",
  signer,
  token: SOLANA_USDT,
  commitment: "confirmed", // 'processed' | 'confirmed' | 'finalized'
});
```

For balances, payment request creation, payment verification, payment monitoring, and transaction lookup, use the read-only client and do not generate a keypair:

```typescript
import { createReadOnlySolanaPayments } from "solana-payments";

const client = createReadOnlySolanaPayments({
  rpcUrl: "https://api.mainnet-beta.solana.com",
  commitment: "confirmed",
});
```

### 2. Balances Module

Fetch balances for any Solana wallet address. Returns the balance in both `bigint` (raw) and `displayAmount` (formatted string).

```typescript
const balance = await client.balances.retrieve({
  owner: "AddressOrPublicKeyString",
});

console.log(`Balance: ${balance.displayAmount} (raw: ${balance.amount})`);
```

### 3. Transfers Module

#### Fetching a Transfer Quote

Before executing a transfer, request a quote to estimate fee lamports and determine if the recipient's Associated Token Account (ATA) needs to be created.

```typescript
const quote = await client.transfers.quote({
  to: "RecipientAddressString",
  amount: "10.50", // accepts string, number, bigint, or TokenAmountInput
});

console.log(`Will create ATA: ${quote.willCreateRecipientAta}`);
console.log(`Estimated fee: ${quote.estimatedFeeLamports} lamports`);
```

#### Creating a Transfer

Send configured SPL tokens to another address. Supports idempotency key for safe retries and custom memo reference keys.

```typescript
const transfer = await client.transfers.create({
  to: "RecipientAddressString",
  amount: "10.50",
  reference: "MyPaymentRef123", // optional Solana Pay reference key
  idempotencyKey: "unique-uuid-string", // optional
  createRecipientAta: true, // optional (defaults to true)
});

console.log(`Transaction Signature: ${transfer.signature}`);
```

### 4. Payments Module (Solana Pay)

#### Create a Payment Request

Generate a payment request structure containing the destination, mint, amount, reference, and a formatted memo string.

```typescript
const request = client.payments.createRequest({
  amount: "10.50",
  recipient: "RecipientAddressString",
  reference: "UniqueRefString",
  metadata: { orderId: "456" },
});
```

#### Build a Solana Pay URL

Convert a payment request into a canonical `URL` object. The helper encodes `amount`, `spl-token`, `reference`, `memo`, and optional `label`/`message` query parameters.

```typescript
const url = client.payments.toSolanaPayUrl(request, {
  label: "Acme Store",
  message: `Order ${request.reference}`,
});
```

#### Verify a Payment

Verify if a transaction signature or reference key contains a valid transfer matching the payment requirements.

```typescript
const verified = await client.payments.verify({
  reference: "UniqueRefString",
  recipient: "RecipientAddressString",
  amount: "10.50",
  limit: 50,
  maxPages: 3,
});

if (verified.found) {
  console.log(`Payment confirmed in slot: ${verified.slot}`);
} else {
  console.log(`Scanned ${verified.scan?.signaturesScanned ?? 0} signatures`);
}
```

#### Monitor Payments

Poll or inspect transactions for a recipient address using a cursor-based approach.

```typescript
const monitorResult = await client.payments.monitor({
  recipient: "RecipientAddressString",
  limit: 10,
});
```

### 5. Transactions Module

Wait for or poll for transaction confirmation status.

```typescript
const status = await client.transactions.wait({
  signature: "SignatureString",
  commitment: "confirmed",
  timeoutMs: 60000,
});
```

## Best Practices & Pitfalls

- **Idempotency Store**: Implement custom `IdempotencyStore` for production to avoid double-spend/double-transfer scenarios on retry.
- **Serverless Checkout**: Do not call `generateKeyPairSigner()` for payment-only checkout flows in Cloudflare Workers or other serverless runtimes. Use `createReadOnlySolanaPayments()` unless the code signs transfers.
- **No-op Signers**: `createNoopSigner()` is re-exported from Solana Kit for advanced external-signing compatibility, but SDK-managed transfers require a real signer.
- **Node.js Environment**: The SDK targets Node.js backends and uses standard `globalThis.crypto` for UUID generation.
- **Commitment Level**: Prefer `confirmed` or `finalized` commitment levels for balance checks and transfer verification to avoid race conditions.
- **Reference Verification Depth**: The default reference scan checks one page of 20 signatures. Use bounded `limit`, `cursor`, and `maxPages` options for delayed checkout confirmations.
