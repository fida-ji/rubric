// GenLayer client wiring for Rubric.
//
// Reads use a chain-only client (no wallet). Writes are signed by the user's
// injected wallet through its EIP-1193 provider, following the documented
// browser flow (createClient with a provider, then client.connect).
import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";
import { CONTRACT_ADDRESS } from "../config";

export type Config = {
  owner: string;
  fee_recipient: string;
  fee_bps: number;
  partial_bps: number;
  max_fee_bps: number;
};

export type Stats = {
  jobs: number;
  open: number;
  submitted: number;
  accepted: number;
  partial: number;
  rejected: number;
  cancelled: number;
  escrowed_wei: string;
  released_wei: string;
};

export type Job = {
  id: number;
  client: string;
  freelancer: string;
  title: string;
  category: string;
  brief: string;
  criteria: string;
  deposit_wei: string;
  created_at: number;
  deadline: number;
  status: string;
  deliverable: string;
  deliverable_ref: string;
  submitted_at: number;
  verdict: string;
  reasoning: string;
  resolved_at: number;
  paid_to_freelancer_wei: string;
  refunded_to_client_wei: string;
  fee_paid_wei: string;
};

// Read-only client: talks directly to the Bradbury RPC, no account needed.
const readClient = createClient({ chain: testnetBradbury });

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// Reads retry with backoff so an occasional gen_call rate limit does not blank
// the page. Callers already read sequentially to avoid a burst on first paint.
async function read<T>(functionName: string, args: any[] = [], attempts = 4): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return (await readClient.readContract({
        address: CONTRACT_ADDRESS,
        functionName,
        args,
      })) as T;
    } catch (e) {
      lastErr = e;
      if (i < attempts - 1) await sleep(600 * (i + 1));
    }
  }
  throw lastErr;
}

export const api = {
  getConfig: () => read<Config>("get_config"),
  getStats: () => read<Stats>("get_stats"),
  listJobs: () => read<Job[]>("list_jobs"),
  getJob: (id: number) => read<Job>("get_job", [id]),
};

// Some wallet-detection paths probe MetaMask-only Snaps methods
// (wallet_getSnaps, etc.). Non-MetaMask wallets reject these, which can bubble
// up and abort an otherwise-fine transaction. We wrap the provider and answer
// those probes with "no snaps installed" while passing everything else through.
const SNAP_PROBE_METHODS = new Set([
  "wallet_getSnaps",
  "wallet_requestSnaps",
  "wallet_invokeSnap",
  "wallet_snap",
]);

export function hardenProvider(provider: any): any {
  if (!provider || typeof provider.request !== "function") return provider;
  const originalRequest = provider.request.bind(provider);
  return new Proxy(provider, {
    get(target, prop, receiver) {
      if (prop === "request") {
        return async (args: any) => {
          if (args && SNAP_PROBE_METHODS.has(args.method)) return {};
          return originalRequest(args);
        };
      }
      const value = Reflect.get(target, prop, receiver);
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
}

/** Build a wallet-bound write client from an injected EIP-1193 provider. */
async function getWriteClient(provider: unknown, address: string) {
  const client = createClient({
    chain: testnetBradbury,
    account: address as `0x${string}`,
    provider: hardenProvider(provider) as never,
  });
  await client.connect("testnetBradbury");
  return client;
}

export type TxPhase = "idle" | "signing" | "pending" | "accepted" | "error";

export type SendArgs = {
  provider: unknown;
  address: string;
  functionName: string;
  args?: any[];
  value?: bigint;
  onHash?: (hash: string) => void;
};

/** Send a write transaction and wait until it is accepted by consensus. */
export async function sendTx({
  provider,
  address,
  functionName,
  args = [],
  value = 0n,
  onHash,
}: SendArgs) {
  const client = await getWriteClient(provider, address);
  const hash = await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName,
    args,
    value,
  });
  if (onHash) onHash(hash as string);
  const receipt = await client.waitForTransactionReceipt({
    hash,
    status: TransactionStatus.ACCEPTED,
    interval: 5000,
    retries: 120,
  });
  return { hash: hash as string, receipt };
}
