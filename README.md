# solana-payments

TypeScript SDK for SPL-token balances, transfers, and payment verification on Solana.
It wraps Solana Kit, SPL Token, and Memo instructions behind a Paystack-style
factory API.

```ts
import { SOLANA_USDT, createKeyPairSignerFromBytes, createSolanaPayments } from "solana-payments";

const signer = await createKeyPairSignerFromBytes(secretKeyBytes);

const solanaPayments = createSolanaPayments({
  rpcUrl: process.env.SOLANA_RPC_URL!,
  signer,
  token: SOLANA_USDT,
  commitment: "confirmed",
});

const balance = await solanaPayments.balances.retrieve({
  owner: signer.address,
});

const transfer = await solanaPayments.transfers.create({
  to: "RecipientWalletAddressHere",
  amount: "10.50",
});
```

For payment-only checkout flows, do not generate a keypair. Use the read-only
client for balances, payment request creation, payment verification, monitoring,
and transaction lookup:

```ts
import { createReadOnlySolanaPayments } from "solana-payments";

const solanaPayments = createReadOnlySolanaPayments({
  rpcUrl: process.env.SOLANA_RPC_URL!,
  commitment: "confirmed",
});

const request = solanaPayments.payments.createRequest({
  amount: "25.00",
  recipient: "MerchantWalletAddressHere",
  reference: "invoice_123",
});

const solanaPayUrl = solanaPayments.payments.toSolanaPayUrl(request, {
  label: "Acme Store",
  message: "Order invoice_123",
});
```

## Features

- Defaults to the `SOLANA_USDT` preset with mint `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB`
- Allows custom SPL-token mint, decimals, and reference-prefix configuration
- Retrieves token balances via associated token accounts
- Creates idempotent recipient ATAs before transfers
- Sends `TransferChecked` with Solana Memo references
- Verifies payments by signature or memo reference
- Builds Solana Pay URLs from payment requests
- Provides polling monitor helpers for incoming payments
- Normalizes RPC and transaction errors into `SolanaPaymentsError`

## Migration from `solana-usdt`

`solana-usdt` has been renamed to `solana-payments`. Install the new package and
use `createSolanaPayments` or `createReadOnlySolanaPayments` for new code.
`createSolanaUsdt`, `createReadOnlySolanaUsdt`, `SolanaUsdtClient`, and
`SolanaUsdtError` remain deprecated compatibility aliases and will be removed
only in a future major release. The default `SOLANA_USDT` preset deliberately
keeps the `solana-usdt:` memo prefix, so existing payment references continue
to verify unchanged.

## Agent Skill

The npm package ships an agent skill at `skills/solana-payments/SKILL.md`. Use it
when asking an AI coding agent to integrate, configure, troubleshoot, or review
`solana-payments` usage.

Install the SDK and symlink bundled npm skills into your agent skill directory:

```bash
pnpm add solana-payments
pnpm add -D skills-npm
pnpm exec skills-npm
```

For npm projects, the equivalent commands are:

```bash
npm install solana-payments
npm install --save-dev skills-npm
npx skills-npm
```

`skills-npm` links the bundled skill as
`skills/npm-solana-payments-solana-payments/SKILL.md`. Add `skills/npm-*` to your
`.gitignore` if you do not want generated skill symlinks committed.

You can also inspect the skill directly with TanStack Intent:

```bash
npx @tanstack/intent@latest load solana-payments#solana-payments
```

Once installed, ask your agent to use the `solana-payments` skill for tasks such as:

- setting up a signer-backed transfer client
- building payment-only checkout flows without keypair generation
- generating Solana Pay URLs
- verifying payments by signature or memo reference
- debugging RPC, commitment, or recipient ATA issues

## API

```ts
const client = createSolanaPayments({
  rpcUrl: "https://api.mainnet-beta.solana.com",
  signer,
  retry: { retries: 3 },
  timeoutMs: 30_000,
});

await client.balances.retrieve({ owner });
await client.transfers.quote({ to, amount: "25" });
await client.transfers.create({ to, amount: "25", reference: "invoice_123" });
const request = client.payments.createRequest({ amount: "25", recipient: owner });
const solanaPayUrl = client.payments.toSolanaPayUrl(request, { label: "Acme Store" });
await client.payments.verify({ reference: "invoice_123", recipient: owner, maxPages: 3 });
await client.payments.monitor({ recipient: owner, limit: 10 });
await client.transactions.retrieve({ signature });
await client.transactions.wait({ signature });
```

## Production Notes

- `signer` is optional for read-only modules. Transfers require a real `TransactionSigner`; calling `transfers.quote()` or `transfers.create()` without one throws `SIGNER_REQUIRED`.
- In Cloudflare Workers and other serverless checkout integrations, avoid `generateKeyPairSigner()` for payment request creation and verification. Use `createReadOnlySolanaPayments()` or pass no signer to `createSolanaPayments()` unless you are actually signing transfers.
- `createNoopSigner()` is re-exported from Solana Kit for advanced compatibility cases where another system will provide signatures, but it must not be used to send SDK-managed transfers.
- `payments.monitor({ recipient })` scans the recipient wallet's associated token account for the configured mint.
- `payments.verify({ recipient })` validates against the recipient wallet's associated token account, not the wallet address as a token destination.
- `payments.verify({ reference, recipient, limit, cursor, maxPages })` defaults to one page of 20 signatures. Increase `limit` or `maxPages` for delayed checkout confirmations, and inspect `verified.scan` when `found` is false to see pages scanned, signatures scanned, the resume cursor, and whether more results may exist.
- `payments.toSolanaPayUrl(request, options)` returns a canonical `URL` object with `amount`, `spl-token`, `reference`, `memo`, and optional `label`/`message` query parameters.
- Transfer idempotency records are stored immediately after `sendTransaction` returns a signature, before confirmation finishes. This prevents duplicate sends if confirmation times out and the same idempotency key is retried.
- `pnpm run test:integration` runs an in-process LiteSVM transfer with a mint override, ATA creation, `TransferChecked`, Memo verification, monitoring, and balance retrieval.
- Run a funded local-validator/devnet smoke transfer against your production RPC provider before handling production funds.

## Development

```bash
pnpm install
vp test run
pnpm run test:integration
tsc -p tsconfig.json --noEmit
vp pack
```

## Mainnet RPC Smoke Test

Run a read-only smoke test against an RPC URL:

```bash
SOLANA_RPC_URL=https://api.mainnet.solana.com pnpm run smoke:mainnet
```

Optional inputs:

```bash
SOLANA_OWNER=YourWalletAddressHere SOLANA_RPC_URL=https://api.mainnet.solana.com pnpm run smoke:mainnet
SOLANA_SIGNATURE=KnownSignatureHere SOLANA_RPC_URL=https://api.mainnet.solana.com pnpm run smoke:mainnet
```

The smoke script checks RPC health, version, blockhash, `balances.retrieve`, `transfers.quote`, and payment request creation. It does not sign or send transactions.

## Payment verification and transfer retries

Payment verification requires a successful transaction at confirmed commitment or higher. Failed or merely processed transactions cannot fulfill an intent. Solana Pay URLs use the request's `solanaPayReference` (a base58 32-byte key); business references remain in the memo. Explicit URL references must be valid public keys.

An idempotent transfer requires a store with `withLock(key, operation)`, in addition to `get` and `set`. The lock must serialize all processes sharing that store; a database advisory lock or equivalent atomic lease is appropriate for persistent stores. `MemoryIdempotencyStore` only coordinates callers sharing one instance in one process. Stores must retain signed transaction bytes: the SDK saves them before broadcast and retries those exact bytes after an ambiguous RPC failure. It never signs a replacement for the same key. Reusing a key with another source account, recipient, amount, mint, or RPC endpoint fails. If an old signed transaction expires, reconcile its signature before explicitly starting a new transfer with a new key.
