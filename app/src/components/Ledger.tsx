import { RefreshCw, Loader2 } from "lucide-react";
import { JobCard } from "./JobCard";
import type { Job } from "../lib/genlayer";
import type { WalletState } from "../lib/wallet";

export function Ledger({
  jobs,
  loading,
  error,
  onRefresh,
  wallet,
}: {
  jobs: Job[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  wallet: WalletState;
}) {
  return (
    <section id="ledger" className="border-b border-ink/15 py-16 md:py-20">
      <div className="wrap">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <span className="eyebrow">Live ledger</span>
            <h2 className="mt-3 font-serif text-3xl tracking-tight sm:text-4xl">
              Every job on this contract, read straight from Bradbury.
            </h2>
            <p className="mt-4 font-sans text-lg leading-relaxed text-ink-soft">
              These are real escrows adjudicated by the GenLayer panel. Expand any job to read the
              brief, the submitted work, the panel&rsquo;s reasoning, and where the money went.
            </p>
          </div>
          <button onClick={onRefresh} disabled={loading} className="btn-ghost">
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Refresh
          </button>
        </div>

        {error && (
          <div className="mt-8 rounded border border-reject/40 bg-reject/5 p-4 font-sans text-sm text-reject">
            Could not read the contract: {error}
          </div>
        )}

        {!error && jobs.length === 0 && loading && (
          <div className="mt-8 flex items-center gap-2 font-sans text-sm text-ink-faint">
            <Loader2 size={16} className="animate-spin" /> Reading jobs from the contract…
          </div>
        )}

        {jobs.length > 0 && (
          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} wallet={wallet} onSettled={onRefresh} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
