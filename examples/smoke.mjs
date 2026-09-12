import { address, createSolanaRpc, generateKeyPairSigner } from "@solana/kit";

import { createSolanaPayments } from "../dist/index.mjs";

const rpcUrl = process.env.SOLANA_RPC_URL ?? "https://api.mainnet.solana.com";
const owner = process.env.SOLANA_OWNER;
const knownSignature = process.env.SOLANA_SIGNATURE;

const rpc = createSolanaRpc(rpcUrl);
const signer = await generateKeyPairSigner();
const recipient = await generateKeyPairSigner();
const client = createSolanaPayments({
  rpcUrl,
  signer,
  commitment: "confirmed",
  timeoutMs: 10_000,
  retry: {
    retries: 2,
    minDelayMs: 250,
    maxDelayMs: 1_000,
  },
});

console.log(`RPC URL: ${rpcUrl}`);
console.log("Mode: read-only smoke test; no transaction is signed or sent.");

await step("RPC health", async () => {
  return { health: await rpc.getHealth().send() };
});

await step("RPC version", async () => {
  return await rpc.getVersion().send();
});

await step("RPC latest blockhash", async () => {
  const response = await rpc.getLatestBlockhash({ commitment: "confirmed" }).send();
  return {
    blockhash: response.value.blockhash,
    lastValidBlockHeight: response.value.lastValidBlockHeight,
  };
});

await step("SDK balance.retrieve", async () => {
  const balance = await client.balances.retrieve({
    owner: owner ? address(owner) : signer.address,
  });
  return balance;
});

await step("SDK transfers.quote", async () => {
  const quote = await client.transfers.quote({
    to: recipient.address,
    amount: "1",
  });
  return quote;
});

await step("SDK payments.createRequest", async () => {
  return client.payments.createRequest({
    amount: "1",
    recipient: owner ? address(owner) : recipient.address,
    metadata: {
      source: "examples/smoke.mjs",
    },
  });
});

if (knownSignature) {
  await step("SDK transactions.retrieve", async () => {
    return client.transactions.retrieve({ signature: knownSignature });
  });
}

async function step(name, fn) {
  try {
    const result = await fn();
    console.log(`PASS ${name}`);
    console.log(JSON.stringify(result, stringifyBigInt, 2));
  } catch (error) {
    console.log(`FAIL ${name}`);
    console.log(error?.message ?? error);
    process.exitCode = 1;
  }
}

function stringifyBigInt(_key, value) {
  return typeof value === "bigint" ? value.toString() : value;
}
