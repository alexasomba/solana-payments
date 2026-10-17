[English](README.md) · [Español](README.es-ES.md) · [Français](README.fr-FR.md)

# solana-payments

SDK TypeScript pour les soldes de jetons SPL, les transferts et la vérification des paiements sur Solana.
Il enveloppe les instructions du kit Solana, du jeton SPL et du mémo derrière un style Paystack
API d'usine.

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

Pour les flux de paiement uniquement, ne générez pas de paire de clés. Utilisez le mode lecture seule
client pour les soldes, la création de demandes de paiement, la vérification des paiements, le suivi,
et recherche de transaction :

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

## Fonctionnalités

- Par défaut, le préréglage `SOLANA_USDT` avec le mint `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB`
- Permet la configuration personnalisée du jeton SPL, des décimales, du programme de jeton et du préfixe de référence
- Récupère les soldes de jetons via les comptes de jetons associés
- Crée des ATA de destinataires idempotents avant les transferts
- Envoie `TransferChecked` avec les références Solana Memo
- Vérifie les paiements par signature ou référence de mémo
- Crée des URL Solana Pay à partir des demandes de paiement
- Fournit des assistants de surveillance des sondages pour les paiements entrants
- Normalise les erreurs RPC et de transaction dans `SolanaPaymentsError`

Pour un atelier appartenant à Token-2022, définissez `token.program` sur `"token-2022"` (ou définissez le
option `tokenProgram` de niveau supérieur lors de l'utilisation de `mint`/`decimals`). Ceci sélectionne le
Dérivation du Token-2022 ATA et instruction de transfert vérifié. Transferts actuellement
prendre en charge les mints de base Token-2022 ; les frais de transfert et les extensions de crochet de transfert nécessitent
instructions/comptes spécifiques à l'extension et ne sont pas traités silencieusement comme des comptes simples
transferts. Confirmez le programme et les extensions propriétaires de la Monnaie avant de l'accepter.

## Migration depuis `solana-usdt`

`solana-usdt` a été renommé `solana-payments`. Installez le nouveau package et
utilisez `createSolanaPayments` ou `createReadOnlySolanaPayments` pour le nouveau code.
`createSolanaUsdt`, `createReadOnlySolanaUsdt`, `SolanaUsdtClient` et
`SolanaUsdtError` restent des alias de compatibilité obsolètes et seront supprimés
seulement dans une future version majeure. Le préréglage par défaut `SOLANA_USDT` est délibérément
conserve le préfixe de mémo `solana-usdt:`, donc les références de paiement existantes continuent
à vérifier inchangé.

## Compétence d'agent

Le package npm fournit une compétence d'agent à `skills/solana-payments/SKILL.md`. Utilisez-le
lorsque vous demandez à un agent de codage IA d'intégrer, de configurer, de dépanner ou de réviser
Utilisation de `solana-payments`.

Installez le SDK et le lien symbolique des compétences npm regroupées dans le répertoire de compétences de votre agent :

```bash
pnpm add solana-payments
pnpm add -D skills-npm
pnpm exec skills-npm
```

Pour les projets npm, les commandes équivalentes sont :

```bash
npm install solana-payments
npm install --save-dev skills-npm
npx skills-npm
```

`skills-npm` relie la compétence groupée en tant que
`skills/npm-solana-payments-solana-payments/SKILL.md`. Ajoutez `skills/npm-*` à votre
`.gitignore` si vous ne souhaitez pas que les liens symboliques de compétences générés soient validés.

Vous pouvez également inspecter la compétence directement avec TanStack Intent :

```bash
npx @tanstack/intent@latest load solana-payments#solana-payments
```

Une fois installé, demandez à votre agent d'utiliser la compétence `solana-payments` pour des tâches telles que :

- mise en place d'un client de transfert soutenu par le signataire
- création de flux de paiement réservés au paiement sans génération de paire de clés
- générer des URL Solana Pay
- vérifier les paiements par signature ou référence mémo
- diagnostic des problèmes RPC, de commitment ou d’ATA du destinataire

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

## Notes de production

- `signer` est facultatif pour les modules en lecture seule. Les transferts nécessitent un véritable `TransactionSigner` ; appeler `transfers.quote()` ou `transfers.create()` sans lancer `SIGNER_REQUIRED`.
- Dans Cloudflare Workers et autres intégrations de paiement sans serveur, évitez `generateKeyPairSigner()` pour la création et la vérification des demandes de paiement. Utilisez `createReadOnlySolanaPayments()` ou ne transmettez aucun signataire à `createSolanaPayments()`, sauf si vous signez réellement des transferts.
- `createNoopSigner()` est réexporté depuis Solana Kit pour les cas de compatibilité avancés où un autre système fournira des signatures, mais il ne doit pas être utilisé pour envoyer des transferts gérés par le SDK.
- `payments.monitor({ recipient })` analyse le compte de jeton associé au portefeuille du destinataire pour la monnaie configurée.
- `payments.verify({ recipient })` valide par rapport au compte de jeton associé au portefeuille du destinataire, et non à l'adresse du portefeuille en tant que destination du jeton.
- `payments.verify({ reference, recipient, limit, cursor, maxPages })` est par défaut une page de 20 signatures. Augmentez `limit` ou `maxPages` pour les confirmations de paiement retardées et inspectez `verified.scan` lorsque `found` est faux pour voir les pages numérisées, les signatures numérisées, le curseur de reprise et s'il peut y avoir d'autres résultats.
- `payments.toSolanaPayUrl(request, options)` renvoie un objet canonique `URL` avec `amount`, `spl-token`, `reference`, `memo` et paramètres de requête `label`/`message` facultatifs.
- Les enregistrements d'idempotence de transfert sont stockés immédiatement après que `sendTransaction` renvoie une signature, avant la fin de la confirmation. Cela évite les envois en double si le délai de confirmation expire et que la même clé d'idempotence est réessayée.
- `pnpm run test:integration` exécute un transfert LiteSVM en cours avec un remplacement de mint, une création ATA, `TransferChecked`, une vérification de mémo, une surveillance et une récupération du solde.
- Exécutez un transfert de fumée de validateur local/devnet financé contre votre fournisseur RPC de production avant de gérer les fonds de production.

## Développement

```bash
pnpm install
vp test run
pnpm run test:integration
tsc -p tsconfig.json --noEmit
vp pack
```

## Test de fumée RPC sur le réseau principal

Exécutez un test de fumée en lecture seule sur une URL RPC :

```bash
SOLANA_RPC_URL=https://api.mainnet.solana.com pnpm run smoke:mainnet
```

Entrées facultatives :

```bash
SOLANA_OWNER=YourWalletAddressHere SOLANA_RPC_URL=https://api.mainnet.solana.com pnpm run smoke:mainnet
SOLANA_SIGNATURE=KnownSignatureHere SOLANA_RPC_URL=https://api.mainnet.solana.com pnpm run smoke:mainnet
```

Le script Smoke vérifie l'état du RPC, la version, le blockhash, `balances.retrieve`, `transfers.quote` et la création de demandes de paiement. Il ne signe ni n’envoie de transactions.

## Vérification des paiements et tentatives de transfert

La vérification du paiement nécessite une transaction réussie avec un niveau de commitment égal ou supérieur à `confirmed`. Les transactions échouées ou simplement traitées ne peuvent pas répondre à une intention. Les URL Solana Pay utilisent le `solanaPayReference` de la requête (une clé base58 de 32 octets) ; les références commerciales restent dans le mémo. Les références URL explicites doivent être des clés publiques valides.

Un transfert idempotent nécessite un magasin avec `withLock(key, operation)`, en plus de `get` et `set`. Le verrou doit sérialiser tous les processus partageant ce magasin ; un verrou consultatif de base de données ou un bail atomique équivalent est approprié pour les magasins persistants. `MemoryIdempotencyStore` coordonne uniquement les appelants partageant une instance dans un processus. Les magasins doivent conserver les octets de transaction signés : le SDK les enregistre avant la diffusion et réessaye ces octets exacts après un échec RPC ambigu. Il ne signe jamais de remplacement pour la même clé. La réutilisation d'une clé avec un autre compte source, destinataire, montant, mint ou point de terminaison RPC échoue. Si une ancienne transaction signée expire, rapprochez sa signature avant de démarrer explicitement un nouveau transfert avec une nouvelle clé.
