import { ArrowRight, ExternalLink, Check } from "lucide-react";
import { CONTRACT_ADDRESS, addrUrl } from "../config";
import { shortAddr } from "../lib/format";
import type { Stats } from "../lib/genlayer";

export function Hero({ stats }: { stats: Stats | null }) {
  return (
    <section id="top" className="border-b border-ink/15">
      <div className="wrap grid gap-12 py-16 md:grid-cols-[1.15fr_0.85fr] md:py-24">
        <div className="flex flex-col justify-center">
          <span className="eyebrow">Escrow on GenLayer</span>
          <h1 className="mt-4 font-serif text-4xl leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            Get paid when the work is good.
            <br />
            <span className="text-vermilion">Get refunded when it is not.</span>
          </h1>
          <p className="mt-6 max-w-xl font-sans text-lg leading-relaxed text-ink-soft">
            Rubric holds a client&rsquo;s payment on-chain while a freelancer does the work. A panel of
            independent AI validators reads the brief, grades the deliverable against the acceptance
            criteria, and settles the escrow. No platform, arbiter, or single model decides the outcome.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a href="#console" className="btn-primary text-[0.95rem]">
              Open the console
              <ArrowRight size={16} />
            </a>
            <a href="#how" className="btn-ghost text-[0.95rem]">
              How it works
            </a>
          </div>

          <a
            href={addrUrl(CONTRACT_ADDRESS)}
            target="_blank"
            rel="noreferrer"
            className="mt-8 inline-flex w-fit items-center gap-2 rounded border border-ink/15 bg-paper-raised px-3 py-2 no-underline"
          >
            <span className="eyebrow">Live on Bradbury</span>
            <span className="mono text-ink">{shortAddr(CONTRACT_ADDRESS, 10, 8)}</span>
            <ExternalLink size={13} className="text-structure" />
          </a>
        </div>

        {/* Concept illustration: a brief graded to a verdict. Built from the design
            system, not a stock image. */}
        <div className="flex items-center">
          <figure className="card w-full p-5 shadow-[6px_6px_0_0_rgba(34,30,23,0.08)]">
            <figcaption className="eyebrow flex items-center justify-between">
              <span>Job #1 · copywriting</span>
              <span className="mono text-ink-faint">0.05 GEN</span>
            </figcaption>
            <h3 className="mt-2 font-serif text-lg">Two-sentence product description</h3>
            <p className="mt-2 border-l-2 border-ink/20 pl-3 font-sans text-sm text-ink-soft">
              Brief: one sentence on what the product does, one on who it is for. Plain language, no
              buzzwords.
            </p>
            <div className="mt-4 rounded border border-ink/15 bg-paper-sunk p-3 font-sans text-sm text-ink">
              Vault keeps every password encrypted behind a single master key and fills them in when
              you sign in. It is built for individuals and small teams who want strong security.
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-ink/15 pt-3">
              <span className="tag border-accept/40 bg-accept/5 text-accept">
                <Check size={13} strokeWidth={2.5} />
                Panel verdict: accept
              </span>
              <span className="mono text-xs text-ink-faint">released to freelancer</span>
            </div>
          </figure>
        </div>
      </div>

      {stats && (
        <div className="border-t border-ink/15 bg-paper-raised/60">
          <div className="wrap grid grid-cols-2 divide-x divide-ink/10 md:grid-cols-4">
            <Stat label="Jobs escrowed" value={String(stats.jobs)} />
            <Stat label="Accepted" value={String(stats.accepted)} />
            <Stat label="Partial / rejected" value={`${stats.partial} / ${stats.rejected}`} />
            <Stat label="Awaiting a verdict" value={String(stats.submitted)} />
          </div>
        </div>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-5">
      <div className="font-serif text-3xl text-ink">{value}</div>
      <div className="eyebrow mt-1">{label}</div>
    </div>
  );
}
