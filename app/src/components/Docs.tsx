import { ExternalLink } from "lucide-react";
import { CONTRACT_ADDRESS, BRADBURY, FAUCET_URL, addrUrl } from "../config";
import type { Config } from "../lib/genlayer";

const VIEW_METHODS = [
  ["get_config", "Owner, fee recipient, fee and partial basis points."],
  ["get_stats", "Counts by status plus total escrowed and released wei."],
  ["list_jobs", "Every job with its brief, deliverable, verdict, and settlement."],
  ["get_job(id)", "A single job by id."],
  ["get_jobs_by_status(s)", "Jobs filtered by status string."],
];

const WRITE_METHODS = [
  ["create_job(freelancer, title, category, brief, criteria, deadline_days)", "payable", "Opens and funds an escrow with the attached GEN."],
  ["submit_deliverable(job_id, deliverable, reference)", "freelancer", "Submits the finished work while the job is open."],
  ["adjudicate(job_id)", "anyone", "Convenes the AI panel and settles the escrow on consensus."],
  ["cancel_job(job_id)", "client", "Refunds the deposit while the job is still open."],
];

export function Docs({ config }: { config: Config | null }) {
  return (
    <section id="docs" className="py-16 md:py-20">
      <div className="wrap">
        <div className="max-w-2xl">
          <span className="eyebrow">Reference</span>
          <h2 className="mt-3 font-serif text-3xl tracking-tight sm:text-4xl">
            Contract and network details.
          </h2>
          <p className="mt-4 font-sans text-lg leading-relaxed text-ink-soft">
            Rubric is a single GenLayer Intelligent Contract written in Python. Reads go straight to the
            Bradbury RPC; writes are signed by your wallet. Everything below is verifiable on the explorer.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_1fr]">
          {/* Deployment facts */}
          <div className="card p-6">
            <h3 className="font-serif text-xl">Deployment</h3>
            <dl className="mt-4 space-y-3 text-sm">
              <Fact label="Contract">
                <a href={addrUrl(CONTRACT_ADDRESS)} target="_blank" rel="noreferrer" className="mono break-all text-structure">
                  {CONTRACT_ADDRESS} <ExternalLink size={12} className="inline" />
                </a>
              </Fact>
              <Fact label="Network">
                {BRADBURY.chainName} (chain id {BRADBURY.chainIdDec})
              </Fact>
              <Fact label="RPC">
                <span className="mono break-all">{BRADBURY.rpcUrl}</span>
              </Fact>
              <Fact label="Currency">
                {BRADBURY.currency.symbol}, {BRADBURY.currency.decimals} decimals
              </Fact>
              {config && (
                <Fact label="Protocol fee">
                  {config.fee_bps / 100}% on released funds; partial pays {config.partial_bps / 100}%
                </Fact>
              )}
              <Fact label="Faucet">
                <a href={FAUCET_URL} target="_blank" rel="noreferrer">
                  testnet-faucet.genlayer.foundation
                </a>
              </Fact>
            </dl>
          </div>

          {/* Settlement rules */}
          <div className="card p-6">
            <h3 className="font-serif text-xl">How a verdict settles</h3>
            <ul className="mt-4 space-y-3 text-sm text-ink-soft">
              <li className="flex gap-3">
                <span className="tag mt-0.5 h-fit border-accept/40 bg-accept/5 text-accept">accept</span>
                <span>Freelancer receives the deposit minus the protocol fee. The client pays for work that met the brief.</span>
              </li>
              <li className="flex gap-3">
                <span className="tag mt-0.5 h-fit border-partial/40 bg-partial/5 text-partial">partial</span>
                <span>Freelancer receives 60% (minus fee); the remaining 40% is refunded to the client. Usable but incomplete work is paid in proportion.</span>
              </li>
              <li className="flex gap-3">
                <span className="tag mt-0.5 h-fit border-reject/40 bg-reject/5 text-reject">reject</span>
                <span>The full deposit is refunded to the client and no fee is charged. Off-brief work costs the client nothing.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Methods */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="card p-6">
            <h3 className="font-serif text-xl">Write methods</h3>
            <div className="mt-4 space-y-3">
              {WRITE_METHODS.map(([sig, who, desc]) => (
                <div key={sig} className="border-b border-ink/10 pb-3 last:border-0 last:pb-0">
                  <code className="mono block break-words text-[0.8rem] text-ink">{sig}</code>
                  <div className="mt-1 flex items-start gap-2">
                    <span className="tag shrink-0 border-ink/20 text-ink-faint">{who}</span>
                    <span className="font-sans text-sm text-ink-soft">{desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-6">
            <h3 className="font-serif text-xl">View methods</h3>
            <div className="mt-4 space-y-3">
              {VIEW_METHODS.map(([sig, desc]) => (
                <div key={sig} className="border-b border-ink/10 pb-3 last:border-0 last:pb-0">
                  <code className="mono block text-[0.8rem] text-ink">{sig}</code>
                  <span className="font-sans text-sm text-ink-soft">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="eyebrow">{label}</dt>
      <dd className="text-ink">{children}</dd>
    </div>
  );
}
