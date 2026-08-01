import { useState } from "react";
import { ChevronDown, Scale } from "lucide-react";
import { StatusTag, VerdictBadge } from "./Badges";
import { TxStatus } from "./TxStatus";
import { fmtGen, shortAddr, fmtDate } from "../lib/format";
import { addrUrl, STATUS } from "../config";
import { useTx } from "../lib/useTx";
import type { Job } from "../lib/genlayer";
import type { WalletState } from "../lib/wallet";

export function JobCard({
  job,
  wallet,
  onSettled,
}: {
  job: Job;
  wallet: WalletState;
  onSettled: () => void;
}) {
  const [open, setOpen] = useState(false);
  const tx = useTx(wallet);
  const submitted = job.status === STATUS.SUBMITTED;

  async function adjudicate() {
    const ok = await tx.run("adjudicate", [job.id]);
    if (ok) onSettled();
  }

  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-4 p-5 text-left"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-ink-faint">#{job.id}</span>
            <span className="font-mono text-xs uppercase tracking-wider text-ink-faint">
              {job.category}
            </span>
          </div>
          <h3 className="mt-1 font-serif text-lg leading-snug text-ink">{job.title}</h3>
          <p className="mt-1 line-clamp-1 font-sans text-sm text-ink-faint">{job.brief}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          {job.verdict ? <VerdictBadge verdict={job.verdict} /> : <StatusTag status={job.status} />}
          <span className="mono text-sm text-ink">{fmtGen(job.deposit_wei)} GEN</span>
          <ChevronDown
            size={16}
            className={`text-ink-faint transition-transform ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {open && (
        <div className="animate-fadeup border-t border-ink/15 px-5 pb-5 pt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Block label="Brief">{job.brief}</Block>
            <Block label="Acceptance criteria">{job.criteria}</Block>
          </div>

          {job.deliverable && (
            <div className="mt-4">
              <div className="eyebrow mb-1">Deliverable</div>
              <pre className="max-h-52 overflow-auto whitespace-pre-wrap rounded border border-ink/15 bg-paper-sunk p-3 font-mono text-[0.8rem] leading-relaxed text-ink">
                {job.deliverable}
              </pre>
            </div>
          )}

          {job.reasoning && (
            <div className="mt-4 border-l-2 border-vermilion/60 pl-3">
              <div className="eyebrow mb-1 text-vermilion">Panel reasoning</div>
              <p className="font-sans text-sm italic text-ink-soft">{job.reasoning}</p>
            </div>
          )}

          <div className="mt-4 grid gap-x-6 gap-y-2 border-t border-ink/15 pt-4 text-sm sm:grid-cols-2">
            <Row label="Client">
              <ExplorerAddr addr={job.client} />
            </Row>
            <Row label="Freelancer">
              <ExplorerAddr addr={job.freelancer} />
            </Row>
            <Row label="Deadline">{fmtDate(job.deadline)}</Row>
            <Row label="Submitted">{fmtDate(job.submitted_at)}</Row>
            {Number(job.paid_to_freelancer_wei) > 0 && (
              <Row label="Paid to freelancer">
                <span className="text-accept">{fmtGen(job.paid_to_freelancer_wei)} GEN</span>
              </Row>
            )}
            {Number(job.refunded_to_client_wei) > 0 && (
              <Row label="Refunded to client">{fmtGen(job.refunded_to_client_wei)} GEN</Row>
            )}
            {Number(job.fee_paid_wei) > 0 && (
              <Row label="Protocol fee">{fmtGen(job.fee_paid_wei)} GEN</Row>
            )}
          </div>

          {submitted && (
            <div className="mt-5 rounded border border-partial/30 bg-partial/5 p-4">
              <p className="font-sans text-sm text-ink-soft">
                This job is awaiting a verdict. Anyone can convene the panel. The transaction runs a
                large language model on each validator and settles the escrow on consensus.
              </p>
              <button onClick={adjudicate} disabled={tx.busy} className="btn-primary mt-3">
                <Scale size={15} />
                {tx.busy ? "Convening the panel" : "Adjudicate this job"}
              </button>
              <TxStatus state={tx.state} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Block({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="eyebrow mb-1">{label}</div>
      <p className="font-sans text-sm leading-relaxed text-ink-soft">{children}</p>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="eyebrow">{label}</span>
      <span className="font-sans text-ink">{children}</span>
    </div>
  );
}

function ExplorerAddr({ addr }: { addr: string }) {
  return (
    <a href={addrUrl(addr)} target="_blank" rel="noreferrer" className="mono text-structure">
      {shortAddr(addr)}
    </a>
  );
}
