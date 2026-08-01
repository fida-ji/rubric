// Seed Rubric with REAL end-to-end escrow examples on Testnet Bradbury.
//   cd deploy && node seed.mjs
// Uses ACCOUNT_PRIVATE_KEY from the root .env as the CLIENT, and CONTRACT_ADDRESS
// from the environment or artifacts/contract-address.txt.
//
// Each example runs a full lifecycle:
//   client.create_job (funds escrow) -> freelancer.submit_deliverable -> adjudicate.
// The freelancer must be a different account than the client, so we generate helper
// freelancer accounts and fund them with a little native GEN for gas. One job is left
// in SUBMITTED state so the live app can adjudicate it on demand.
//
// Deposits are intentionally small to conserve testnet GEN. Never prints the key.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import dotenv from "dotenv";
import { createClient, createAccount, generatePrivateKey } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
dotenv.config({ path: resolve(root, ".env") });

const EXPLORER = "https://explorer-bradbury.genlayer.com";
const GEN = 10n ** 18n;
const DEPOSIT = GEN / 20n;      // 0.05 GEN escrowed per job
const GAS_FUND = GEN / 4n;      // 0.25 GEN sent to each freelancer for gas
const DEADLINE_DAYS = 21;

const pk = process.env.ACCOUNT_PRIVATE_KEY;
let CONTRACT = process.env.CONTRACT_ADDRESS;
if (!CONTRACT) {
  try { CONTRACT = readFileSync(resolve(root, "artifacts/contract-address.txt"), "utf8").trim(); } catch {}
}
if (!pk || !CONTRACT) {
  console.error("Need ACCOUNT_PRIVATE_KEY in .env and CONTRACT_ADDRESS (env or artifacts/contract-address.txt)");
  process.exit(1);
}

const client = createAccount(pk.startsWith("0x") ? pk : `0x${pk}`);
const clientClient = createClient({ chain: testnetBradbury, account: client });
const readClient = createClient({ chain: testnetBradbury });

// The seeded scenarios. Deliverables are written to make each verdict clear-cut so
// real validators reliably reach consensus on the intended outcome.
const JOBS = [
  {
    key: "accept-copy",
    adjudicate: true,
    title: "Two-sentence product description",
    category: "copywriting",
    brief:
      "Write a product description for a password manager in exactly two sentences. The first " +
      "sentence must say what the product does. The second sentence must say who it is for. " +
      "Use plain language and avoid marketing buzzwords.",
    criteria:
      "Exactly two sentences. The first says what the product does. The second says who it is for. " +
      "No marketing buzzwords.",
    deliverable:
      "Vault keeps every password encrypted behind a single master key and fills them in " +
      "automatically when you sign in. It is built for individuals and small teams who want " +
      "strong security without changing how they already work.",
    reference: "",
  },
  {
    key: "accept-code",
    adjudicate: true,
    title: "Python helper: add(a, b)",
    category: "code",
    brief:
      "Write a single Python function add(a, b) that returns the sum of its two arguments. " +
      "Include a one-line docstring and one usage example written as a comment.",
    criteria:
      "Defines add(a, b). Returns a + b. Has a docstring. Includes one usage example as a comment.",
    deliverable:
      "def add(a, b):\n" +
      "    \"\"\"Return the sum of a and b.\"\"\"\n" +
      "    return a + b\n\n" +
      "# Example: add(2, 3) -> 5",
    reference: "",
  },
  {
    key: "partial-faq",
    adjudicate: true,
    title: "Product FAQ: three required answers",
    category: "content",
    brief:
      "Write a customer FAQ that answers exactly three questions for a SaaS product: (a) how " +
      "pricing works, (b) the refund policy, and (c) how customer data is stored and protected. " +
      "Give a clear two to three sentence answer for each of the three questions.",
    criteria:
      "All three questions are answered (pricing, refunds, data privacy). Each answer is two to " +
      "three sentences and specific.",
    deliverable:
      "How does pricing work? Rubric charges a flat 1% protocol fee on the amount released to the " +
      "freelancer, and nothing else. There are no monthly fees and you only pay when work passes.\n\n" +
      "What is the refund policy? If the AI panel rejects the work, the full deposit is returned to " +
      "the client automatically. No fee is charged on rejected work.\n\n" +
      "How is my data stored? It is encrypted.",
    reference: "",
  },
  {
    key: "reject-offbrief",
    adjudicate: true,
    title: "Python helper: slugify(text)",
    category: "code",
    brief:
      "Write a single Python function slugify(text) that lowercases the input, replaces spaces " +
      "with hyphens, and strips characters that are not letters, digits, or hyphens. Include a " +
      "docstring and two usage examples in comments.",
    criteria:
      "Working Python code defining slugify(text) with a docstring and two examples. Implements " +
      "lowercasing, space-to-hyphen, and stripping of invalid characters.",
    deliverable:
      "Search engine optimization is essential for modern websites. By focusing on keywords and " +
      "backlinks, brands can climb the rankings and reach a wider audience over time. A strong " +
      "content strategy is the foundation of any successful marketing funnel.",
    reference: "",
  },
  {
    key: "submitted", // left awaiting a verdict so the live console can adjudicate it
    adjudicate: false,
    title: "Release notes for v2.0",
    category: "content",
    brief:
      "Draft concise release notes for version 2.0 of a CLI tool. List three user-facing changes " +
      "as short bullet points and add a one-line upgrade instruction at the end.",
    criteria:
      "Exactly three bullet points describing user-facing changes, plus one clear upgrade line. " +
      "Concise and free of marketing language.",
    deliverable:
      "v2.0\n- Config now loads from rubric.toml instead of environment variables.\n" +
      "- Added `rubric verify` to check a deliverable against a brief locally.\n" +
      "- Faster startup: cold start dropped from 900ms to 120ms.\n\n" +
      "Upgrade: run `npm install -g rubric@2` and rename your config to rubric.toml.",
    reference: "",
  },
];

async function pollStandardReceipt(hash, tries = 40) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await readClient.getTransactionReceipt({ hash });
      if (r && r.status) return r.status;
    } catch {}
    await new Promise((res) => setTimeout(res, 4000));
  }
  return null;
}

async function fundFreelancer(addr) {
  process.stderr.write(`  funding freelancer ${addr} … `);
  const hash = await clientClient.sendTransaction({ to: addr, value: GAS_FUND });
  const status = await pollStandardReceipt(hash);
  console.error(status === "success" ? `ok  ${EXPLORER}/tx/${hash}` : `status=${status}`);
}

async function write(signerClient, label, functionName, args, value = 0n) {
  process.stderr.write(`  ${label} … `);
  const hash = await signerClient.writeContract({ address: CONTRACT, functionName, args, value });
  await signerClient.waitForTransactionReceipt({
    hash, status: TransactionStatus.ACCEPTED, interval: 5000, retries: 120,
  });
  console.error(`ok  ${EXPLORER}/tx/${hash}`);
  return hash;
}

async function read(functionName, args = []) {
  return readClient.readContract({ address: CONTRACT, functionName, args });
}

async function main() {
  console.error(`Seeding Rubric ${CONTRACT}\n  client = ${client.address}\n`);

  const existing = await read("list_jobs");
  if (Array.isArray(existing) && existing.length >= JOBS.length) {
    console.error(`Contract already has ${existing.length} jobs; nothing to seed.`);
    return;
  }
  let nextId = (Array.isArray(existing) ? existing.length : 0) + 1;

  // One helper freelancer account per job (distinct addresses make the listing realistic).
  const freelancers = JOBS.map(() => createAccount(generatePrivateKey()));
  console.error("Funding freelancer accounts for gas:");
  for (const f of freelancers) await fundFreelancer(f.address);
  console.error("");

  for (let i = 0; i < JOBS.length; i++) {
    const job = JOBS[i];
    const freelancer = freelancers[i];
    const freelancerClient = createClient({ chain: testnetBradbury, account: freelancer });
    const jobId = nextId++;
    console.error(`Job #${jobId} [${job.key}] "${job.title}"  freelancer=${freelancer.address}`);

    await write(clientClient, "create_job (fund 0.05 GEN)", "create_job",
      [freelancer.address, job.title, job.category, job.brief, job.criteria, DEADLINE_DAYS], DEPOSIT);

    await write(freelancerClient, "submit_deliverable", "submit_deliverable",
      [jobId, job.deliverable, job.reference]);

    if (job.adjudicate) {
      await write(clientClient, "adjudicate (AI panel)", "adjudicate", [jobId]);
    } else {
      console.error(`  -> left SUBMITTED (awaiting a verdict; adjudicate live from the app)`);
    }
    console.error("");
  }

  // Read authoritative state at the end (reads right after a write can be stale).
  const jobs = await read("list_jobs");
  const stats = await read("get_stats");
  console.error("================ RESULT (on-chain) ================");
  for (const j of jobs) {
    console.error(`  #${j.id} ${j.status.padEnd(9)} verdict=${(j.verdict || "-").padEnd(7)} "${j.title}"`);
  }
  console.error("---------------------------------------------------");
  console.error("stats:", JSON.stringify(stats));
  console.error("===================================================");
}

main().catch((e) => { console.error("SEED FAILED:", e?.message || e); process.exit(1); });
