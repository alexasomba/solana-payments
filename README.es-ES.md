[English](README.md) · [Español](README.es-ES.md) · [Français](README.fr-FR.md)

# solana-payments

SDK de TypeScript para gestionar saldos de tokens SPL, realizar transferencias y verificar pagos en Solana.
Integra Solana Kit, SPL Token e instrucciones de «memo» (notas) mediante una API de tipo «factory» (fábrica), al estilo de Paystack.

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

Para flujos de pago (checkout) que solo requieren realizar cobros, no es necesario generar un par de claves (keypair). Utiliza el cliente de solo lectura para consultar saldos, crear solicitudes de pago, verificar pagos, realizar un seguimiento y buscar transacciones:

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

## Características

- Configuración predeterminada: `SOLANA_USDT` con el «mint» (emisión de token) `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB`.
- Permite personalizar el «mint» del token SPL, los decimales, el programa de tokens y el prefijo de referencia.
- Obtiene saldos de tokens a través de cuentas de token asociadas (ATA, por sus siglas en inglés).
- Crea cuentas de token asociadas (ATA) para el destinatario de forma idempotente antes de realizar transferencias.
- Envía `TransferChecked` con referencias de memo de Solana.
- Verifica pagos mediante firma o referencia en el «memo».
- Genera URLs de Solana Pay a partir de solicitudes de pago.
- Proporciona utilidades de monitoreo mediante sondeo (polling) para detectar pagos entrantes.
- Normaliza los errores de RPC y de transacciones en un formato estandarizado: `SolanaPaymentsError`.

Para un «mint» gestionado por el programa Token-2022, establece `token.program` en `"token-2022"` (o configura la opción de nivel superior `tokenProgram` al utilizar `mint`/`decimals`). Esto selecciona la derivación de cuentas de token asociadas (ATA) y la instrucción de transferencia verificada propias de Token-2022. Actualmente, las transferencias admiten «mints» básicos de Token-2022. Las extensiones `transfer-fee` (comisión por transferencia) y `transfer-hook` (gancho de transferencia) requieren instrucciones o cuentas específicas para dichas extensiones y no se procesan automáticamente como transferencias simples. Antes de aceptar un activo, verifica el programa propietario del _mint_ (emisor) y sus extensiones.

## Migración desde `solana-usdt`

`solana-usdt` ha sido renombrado a `solana-payments`. Instala el nuevo paquete y utiliza `createSolanaPayments` o `createReadOnlySolanaPayments` para el código nuevo.
`createSolanaUsdt`, `createReadOnlySolanaUsdt`, `SolanaUsdtClient` y
`SolanaUsdtError` permanecen como alias de compatibilidad obsoletos (_deprecated_) y solo se eliminarán en una futura versión mayor. La configuración predeterminada `SOLANA_USDT` mantiene deliberadamente el prefijo de nota (_memo prefix_) `solana-usdt:`, de modo que las referencias de pago existentes sigan siendo válidas sin cambios.

## Habilidad para agentes (_Agent Skill_)

El paquete npm incluye una «habilidad para agentes» (_agent skill_) en `skills/solana-payments/SKILL.md`. Utilízala cuando solicites a un agente de IA para programación que integre, configure, depure o revise el uso de `solana-payments`.

Instala el SDK y crea enlaces simbólicos (_symlinks_) de las habilidades npm incluidas hacia tu directorio de habilidades para agentes:

```bash
pnpm add solana-payments
pnpm add -D skills-npm
pnpm exec skills-npm
```

Para proyectos npm, los comandos equivalentes son:

```bash
npm install solana-payments
npm install --save-dev skills-npm
npx skills-npm
```

`skills-npm` enlaza la habilidad incluida como
`skills/npm-solana-payments-solana-payments/SKILL.md`. Añade `skills/npm-*` a tu
`.gitignore` si no deseas que los enlaces simbólicos (symlinks) de las _skills_ generadas se incluyan en el control de versiones (commit).

También puedes inspeccionar la _skill_ directamente con TanStack Intent:

```bash
npx @tanstack/intent@latest load solana-payments#solana-payments
```

Una vez instalada, solicita a tu agente que utilice la _skill_ `solana-payments` para tareas como:

- configurar un cliente de transferencias respaldado por un firmante (_signer_)
- crear flujos de pago (_checkout_) que solo admitan pagos, sin necesidad de generar pares de claves (_keypairs_)
- generar URL de Solana Pay
- verificar pagos mediante firma o referencia en un _memo_
- depurar problemas relacionados con RPC, niveles de confirmación (_commitment_) o la cuenta de token asociada (ATA) del destinatario

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

## Notas para producción

- `signer` es opcional para módulos de solo lectura. Las transferencias requieren un `TransactionSigner` real; llamar a `transfers.quote()` o `transfers.create()` sin uno provocará un error `SIGNER_REQUIRED`.
- En Cloudflare Workers y otras integraciones de _checkout_ sin servidor (_serverless_), evita usar `generateKeyPairSigner()` para la creación y verificación de solicitudes de pago. Utiliza `createReadOnlySolanaPayments()` o no pases ningún firmante a `createSolanaPayments()`, a menos que realmente vayas a firmar transferencias.
- `createNoopSigner()` se reexporta desde Solana Kit para casos de compatibilidad avanzada en los que otro sistema proporcionará las firmas; sin embargo, no debe utilizarse para enviar transferencias gestionadas por el SDK.
- `payments.monitor({ recipient })` analiza la cuenta de token asociada (ATA) de la billetera del destinatario en busca del _mint_ configurado.
- `payments.verify({ recipient })` realiza la validación con respecto a la cuenta de token asociada a la billetera del destinatario, y no con respecto a la dirección de la billetera como destino del token.
- `payments.verify({ reference, recipient, limit, cursor, maxPages })` devuelve, de forma predeterminada, una página con 20 firmas. Aumente los valores de `limit` o `maxPages` en caso de confirmaciones de pago (checkout) con retraso; asimismo, revise `verified.scan` cuando `found` sea falso para consultar las páginas escaneadas, las firmas escaneadas, el cursor de reanudación y si existen resultados adicionales.
- `payments.toSolanaPayUrl(request, options)` devuelve un objeto canónico `URL` que incluye `amount`, `spl-token`, `reference`, `memo`, además de los parámetros de consulta opcionales `label`/`message`.
- Los registros de idempotencia de las transferencias se almacenan inmediatamente después de que `sendTransaction` devuelve una firma, antes de que finalice la confirmación. Esto evita envíos duplicados si la confirmación agota su tiempo de espera (timeout) y se intenta realizar la operación nuevamente utilizando la misma clave de idempotencia.
- `pnpm run test:integration` ejecuta una transferencia LiteSVM dentro del proceso, la cual incluye la sobrescritura de mint, la creación de una cuenta de token asociada (ATA), `TransferChecked`, la verificación de notas (Memo), el monitoreo y la obtención del saldo.
- Realiza una prueba de transferencia (smoke test) utilizando un validador local o una red de desarrollo (devnet) con fondos, a través de tu proveedor de RPC de producción, antes de gestionar fondos reales.

## Desarrollo

```bash
pnpm install
vp test run
pnpm run test:integration
tsc -p tsconfig.json --noEmit
vp pack
```

## Prueba de funcionamiento (smoke test) de RPC en la red principal (Mainnet)

Ejecuta una prueba de funcionamiento de solo lectura contra una URL de RPC:

```bash
SOLANA_RPC_URL=https://api.mainnet.solana.com pnpm run smoke:mainnet
```

Entradas opcionales:

```bash
SOLANA_OWNER=YourWalletAddressHere SOLANA_RPC_URL=https://api.mainnet.solana.com pnpm run smoke:mainnet
SOLANA_SIGNATURE=KnownSignatureHere SOLANA_RPC_URL=https://api.mainnet.solana.com pnpm run smoke:mainnet
```

El script de prueba verifica el estado del RPC, la versión, el hash del bloque (blockhash), `balances.retrieve`, `transfers.quote` y la creación de solicitudes de pago. No firma ni envía transacciones.

## Verificación de pagos y reintentos de transferencia

La verificación de un pago requiere que la transacción se haya completado con éxito, alcanzando al menos el nivel de confirmación "confirmed" (o superior). Las transacciones fallidas o simplemente procesadas no cumplen con el objetivo de la operación. Las URL de Solana Pay utilizan el parámetro `solanaPayReference` de la solicitud (una clave de 32 bytes codificada en base58); las referencias comerciales se incluyen en el campo "memo". Las referencias explícitas en la URL deben ser claves públicas válidas.

Una transferencia idempotente requiere un almacenamiento que gestione `withLock(key, operation)`, además de `get` y `set`. El mecanismo de bloqueo debe serializar todos los procesos que compartan dicho almacenamiento; para almacenamientos persistentes, resulta adecuado utilizar un bloqueo consultivo de base de datos (advisory lock) o un mecanismo de concesión atómica equivalente. `MemoryIdempotencyStore` solo coordina a los llamadores que comparten una misma instancia dentro de un mismo proceso. Los sistemas de almacenamiento deben conservar los bytes de la transacción firmada: el SDK los guarda antes de la difusión (broadcast) y, en caso de un fallo ambiguo en el RPC, reintenta la operación utilizando exactamente esos mismos bytes. El sistema nunca firma una transacción de reemplazo para una misma clave. Reutilizar una clave con una cuenta de origen, destinatario, monto, activo (mint) o punto final (endpoint) de RPC diferentes provocará un error. Si una transacción firmada anteriormente caduca, es necesario conciliar su firma antes de iniciar explícitamente una nueva transferencia con una clave distinta.
