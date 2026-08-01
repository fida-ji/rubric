// Deploy Rubric to GenLayer Testnet Bradbury.
//   cd deploy && npm install && node deploy.mjs
// Reads ACCOUNT_PRIVATE_KEY (funded) and optional FEE_RECIPIENT / FEE_BPS from the
// root .env. Prints the deployed contract address to stdout and also writes it to
// artifacts/contract-address.txt (gitignored) for the seed script. Never prints the key.
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import dotenv from "dotenv";
import { createClient, createAccount } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
dotenv.config({ path: resolve(root, ".env") });

const pk = process.env.ACCOUNT_PRIVATE_KEY;
if (!pk) {
  console.error("ACCOUNT_PRIVATE_KEY is not set in .env");
  process.exit(1);
}

const account = createAccount(pk.startsWith("0x") ? pk : `0x${pk}`);
const feeRecipient = (process.env.FEE_RECIPIENT || "").trim(); // blank -> contract defaults to deployer
const feeBps = Number(process.env.FEE_BPS || 100);

const code = readFileSync(resolve(root, "contracts/rubric.py"), "utf8");
const client = createClient({ chain: testnetBradbury, account });

console.error(
  `Deploying Rubric from ${account.address} (fee_recipient=${feeRecipient || "(deployer)"}, fee_bps=${feeBps})…`,
);

const hash = await client.deployContract({ code, args: [feeRecipient, feeBps] });
console.error(`deploy tx: ${hash}`);

const receipt = await client.waitForTransactionReceipt({
  hash,
  status: TransactionStatus.ACCEPTED,
  interval: 5000,
  retries: 60,
});

const address =
  receipt?.txDataDecoded?.contractAddress ??
  receipt?.data?.contract_address ??
  receipt?.contractAddress;

if (!address) {
  console.error("Could not read contract address from receipt:");
  console.error(JSON.stringify(receipt, null, 2).slice(0, 2000));
  process.exit(1);
}

const outDir = resolve(root, "artifacts");
mkdirSync(outDir, { recursive: true });
writeFileSync(resolve(outDir, "contract-address.txt"), String(address), "utf8");
writeFileSync(
  resolve(outDir, "deploy.json"),
  JSON.stringify({ address, deployTx: hash, chain: "testnet-bradbury" }, null, 2),
  "utf8",
);

console.error(`explorer: https://explorer-bradbury.genlayer.com/tx/${hash}`);
// Only the address goes to stdout so it can be captured cleanly.
console.log(address);
