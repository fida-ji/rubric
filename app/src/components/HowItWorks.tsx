import { Wallet, Send, Scale, Coins } from "lucide-react";

const STEPS = [
  {
    n: "01",
    icon: <Wallet size={18} />,
    title: "Client funds a brief",
    body: "The client names a freelancer, writes the brief and the acceptance criteria, and attaches the payment. The GEN is held by the contract, not by Rubric and not by either party.",
  },
  {
    n: "02",
    icon: <Send size={18} />,
    title: "Freelancer delivers",
    body: "The freelancer submits the finished work as text. Only the named freelancer can submit, and only while the job is open. The deliverable is stored on-chain with the brief.",
  },
  {
    n: "03",
    icon: <Scale size={18} />,
    title: "A panel grades the work",
    body: "Each GenLayer validator runs a large language model, reads the brief and the deliverable, and grades it against the criteria. They must reach consensus on one verdict: accept, partial, or reject.",
  },
  {
    n: "04",
    icon: <Coins size={18} />,
    title: "The escrow settles",
    body: "Accept pays the freelancer the deposit minus a 1% fee. Partial pays 60% and refunds the rest. Reject refunds the client in full with no fee. The money moves in the same transaction as the verdict.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="border-b border-ink/15 py-16 md:py-20">
      <div className="wrap">
        <div className="max-w-2xl">
          <span className="eyebrow">How it works</span>
          <h2 className="mt-3 font-serif text-3xl tracking-tight sm:text-4xl">
            An escrow that reads the work before it releases the money.
          </h2>
          <p className="mt-4 font-sans text-lg leading-relaxed text-ink-soft">
            Ordinary escrow releases on a timer or on a manual click. Rubric releases on a judgment:
            whether the deliverable actually meets the brief. That judgment is subjective, so it runs
            on a decentralized panel instead of a single referee.
          </p>
        </div>

        <div className="mt-12 grid gap-px overflow-hidden rounded border border-ink/15 bg-ink/15 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s) => (
            <div key={s.n} className="flex flex-col bg-paper-raised p-6">
              <div className="flex items-center justify-between">
                <span className="text-vermilion">{s.icon}</span>
                <span className="font-mono text-xs text-ink-faint">{s.n}</span>
              </div>
              <h3 className="mt-4 font-serif text-xl">{s.title}</h3>
              <p className="mt-2 font-sans text-sm leading-relaxed text-ink-soft">{s.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <Note title="Why a panel and not one model">
            A single model can be biased, coaxed, or wrong. On GenLayer the leader proposes a verdict
            and other validators independently re-grade the same brief and deliverable. They only agree
            when they reach the same verdict, so no one validator decides a payout alone.
          </Note>
          <Note title="What the contract owns, and what it does not">
            The contract owns the escrowed funds, the state transitions, and the settlement math, which
            are all deterministic. It does not own the grade. The grade is the one subjective step, and
            it is the reason this belongs on GenLayer rather than in a plain smart contract.
          </Note>
        </div>
      </div>
    </section>
  );
}

function Note({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-6">
      <h4 className="font-serif text-lg">{title}</h4>
      <p className="mt-2 font-sans text-sm leading-relaxed text-ink-soft">{children}</p>
    </div>
  );
}
