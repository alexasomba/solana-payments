# Changelog

## [0.4.1](https://github.com/alexasomba/solana-payments/compare/v0.4.0...v0.4.1) (2026-09-12)


### Bug Fixes

* update vite dependency to use catalog and enhance formatting options ([95d4951](https://github.com/alexasomba/solana-payments/commit/95d4951fdf778e42f650299687ec70d324ec193a))


### Miscellaneous Chores

* prepare 0.4.1 release ([05f022d](https://github.com/alexasomba/solana-payments/commit/05f022d5c89192e21724001610af4aae88873312))
* update dependencies and vite configuration ([2c776b1](https://github.com/alexasomba/solana-payments/commit/2c776b168aa7d46d97922f54e2e8189baf20ef20))


### Documentation

* link 0.4.0 changelog to GitHub release ([bef9ab9](https://github.com/alexasomba/solana-payments/commit/bef9ab9ca3b898aa98af2819cc9abe67e44c9ba0))

## [0.4.0](https://github.com/alexasomba/solana-payments/releases/tag/v0.4.0) (2026-08-22)

### Features

* rename the SDK to `solana-payments` and add generic Solana payment APIs

### Migration

* Install `solana-payments` instead of `solana-usdt` and use `createSolanaPayments` or `createReadOnlySolanaPayments` for new code.
* Deprecated `createSolanaUsdt`, `createReadOnlySolanaUsdt`, `SolanaUsdtClient`, and `SolanaUsdtError` aliases remain available until a future major release.
* `SOLANA_USDT` remains the default preset and preserves the `solana-usdt:` memo prefix, so existing payment references continue to verify.

## [0.3.4](https://github.com/alexasomba/solana-usdt/compare/v0.3.3...v0.3.4) (2026-08-22)


### Bug Fixes

* automate solana-usdt npm releases ([59290d5](https://github.com/alexasomba/solana-usdt/commit/59290d5d15279f62e78b2d34ef7c5ee749e1e145))
* keep skill metadata in release updates ([c171e78](https://github.com/alexasomba/solana-usdt/commit/c171e785fff1a5156adffe175f2e6044cba5f1db))


### Miscellaneous Chores

* update pnpm workspace dependencies and adjust vitest import ([587df1f](https://github.com/alexasomba/solana-usdt/commit/587df1f22c408b7d330cb44a27c3ab3ae1c584b2))

## 0.3.3 - 2026-06-01

### Changed

- Updated the npm publish workflow to use npm trusted publishing through GitHub Actions OIDC instead of a long-lived npm token.

## 0.3.2 - 2026-06-01

### Changed

- Added a GitHub Actions npm publish workflow for provenance-backed releases.
- Enabled npm provenance in `publishConfig` so future publishes must include provenance.
- Normalized the package repository URL used by npm provenance checks.

## 0.3.1 - 2026-06-01

### Documentation

- Added README instructions for loading the packaged `solana-usdt` agent skill from npm packages.

## 0.3.0 - 2026-06-01

### Added

- Added `createReadOnlySolanaUsdt()` for balances, payment requests, payment verification, monitoring, and transaction lookup without keypair generation.
- Added `payments.toSolanaPayUrl()` and the standalone `toSolanaPayUrl()` helper for canonical Solana Pay payment request URLs.
- Added configurable reference verification scan depth with `limit`, `cursor`, `maxPages`, and `verified.scan` diagnostics.
- Re-exported Solana Kit's `createNoopSigner()` for advanced external-signing compatibility.

### Changed

- Made the root `signer` option optional for read-only modules while keeping transfer APIs behind an explicit `TransactionSigner`.
- Updated README, quickstart, and packaged skill guidance for payment-only serverless checkout integrations.
- Fixed the Vite+ `repo:build` task configuration so the required release build gate can run.
