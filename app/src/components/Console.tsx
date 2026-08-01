import { useState } from "react";
import { Wallet, PlusCircle, Send, Scale, Ban } from "lucide-react";
import { TxStatus } from "./TxStatus";
import { useTx } from "../lib/useTx";
import { parseGen } from "../lib/format";
import { FAUCET_URL } from "../config";
import type { WalletState } from "../lib/wallet";

type Tab = "create" | "submit" | "adjudicate" | "cancel";

const TABS: { id: Tab; label: string; icon: JSX.Element }[] = [
  { id: "create", label: "Create job", icon: <PlusCircle size={15} /> },
  { id: "submit", label: "Submit work", icon: <Send size={15} /> },
  { id: "adjudicate", label: "Adjudicate", icon: <Scale size={15} /> },
  { id: "cancel", label: "Cancel", icon: <Ban size={15} /> },
];

export function Console({ wallet, onChange }: { wallet: WalletState; onChange: () => void }) {
  const [tab, setTab] = useState<Tab>("create");

  return (
    <section id="console" className="border-b border-ink/15 bg-paper-raised/50 py-16 md:py-20">
      <div className="wrap">
        <div className="max-w-2xl">
          <span className="eyebrow">Interactive console</span>
          <h2 className="mt-3 font-serif text-3xl tracking-tight sm:text-4xl">
            Run the full escrow yourself, on-chain.
          </h2>
          <p className="mt-4 font-sans text-lg leading-relaxed text-ink-soft">
            Every action here is a real transaction on Bradbury. Deposits use testnet GEN with no real
            value. The freelancer address must differ from the connected wallet, since a client cannot
            grade their own escrow.
          </p>
        </div>

        {!wallet.address ? (
          <div className="mt-8 card flex flex-col items-start gap-3 p-6">
            <p className="font-sans text-ink-soft">
              Connect an injected wallet to use the console. You can still read the live ledger above
              without connecting. Need testnet GEN?{" "}
              <a href={FAUCET_URL} target="_blank" rel="noreferrer">
                Claim from the faucet
              </a>
              .
            </p>
            <button onClick={wallet.connect} disabled={wallet.connecting} className="btn-primary">
              <Wallet size={15} />
              {wallet.connecting ? "Connecting" : "Connect wallet"}
            </button>
            {wallet.error && <p className="font-sans text-sm text-reject">{wallet.error}</p>}
          </div>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[220px_1fr]">
            <div className="flex flex-row gap-2 lg:flex-col">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`btn justify-start ${
                    tab === t.id
                      ? "border-vermilion bg-vermilion/10 text-vermilion"
                      : "border-ink/20 text-ink-soft hover:bg-ink/5"
                  }`}
                >
                  {t.icon}
                  <span className="hidden sm:inline">{t.label}</span>
                </button>
              ))}
            </div>

            <div className="card p-6">
              {tab === "create" && <CreateForm wallet={wallet} onChange={onChange} />}
              {tab === "submit" && <SubmitForm wallet={wallet} onChange={onChange} />}
              {tab === "adjudicate" && <AdjudicateForm wallet={wallet} onChange={onChange} />}
              {tab === "cancel" && <CancelForm wallet={wallet} onChange={onChange} />}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function CreateForm({ wallet, onChange }: { wallet: WalletState; onChange: () => void }) {
  const tx = useTx(wallet);
  const [freelancer, setFreelancer] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("copywriting");
  const [brief, setBrief] = useState("");
  const [criteria, setCriteria] = useState("");
  const [days, setDays] = useState("14");
  const [deposit, setDeposit] = useState("0.02");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const ok = await tx.run(
      "create_job",
      [freelancer.trim(), title.trim(), category.trim(), brief.trim(), criteria.trim(), Number(days)],
      parseGen(deposit),
    );
    if (ok) onChange();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Intro title="Open and fund an escrow">
        The attached GEN becomes the deposit held by the contract until the panel returns a verdict.
      </Intro>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Freelancer address" value={freelancer} onChange={setFreelancer} placeholder="0x…" mono required />
        <Field label="Deposit (GEN)" value={deposit} onChange={setDeposit} placeholder="0.02" mono required />
      </div>
      <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
        <Field label="Title" value={title} onChange={setTitle} placeholder="Landing page hero copy" required />
        <Field label="Category" value={category} onChange={setCategory} placeholder="copywriting" required />
      </div>
      <TextArea label="Brief" value={brief} onChange={setBrief} placeholder="What the client is asking for (at least 20 characters)." rows={3} required />
      <TextArea label="Acceptance criteria" value={criteria} onChange={setCriteria} placeholder="The rubric the panel grades against." rows={2} required />
      <Field label="Deadline (days)" value={days} onChange={setDays} placeholder="14" mono required />
      <button type="submit" disabled={tx.busy} className="btn-primary">
        <PlusCircle size={15} />
        {tx.busy ? "Funding escrow" : "Create and fund job"}
      </button>
      <TxStatus state={tx.state} />
    </form>
  );
}

function SubmitForm({ wallet, onChange }: { wallet: WalletState; onChange: () => void }) {
  const tx = useTx(wallet);
  const [jobId, setJobId] = useState("");
  const [deliverable, setDeliverable] = useState("");
  const [reference, setReference] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const ok = await tx.run("submit_deliverable", [Number(jobId), deliverable, reference.trim()]);
    if (ok) onChange();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Intro title="Submit the finished work">
        Only the freelancer named on the job can submit, and only while the job is open. The connected
        wallet must be that freelancer.
      </Intro>
      <Field label="Job ID" value={jobId} onChange={setJobId} placeholder="1" mono required />
      <TextArea label="Deliverable" value={deliverable} onChange={setDeliverable} placeholder="Paste the finished work as text (at least 20 characters)." rows={5} required />
      <Field label="Reference link (optional)" value={reference} onChange={setReference} placeholder="https://…" mono />
      <button type="submit" disabled={tx.busy} className="btn-primary">
        <Send size={15} />
        {tx.busy ? "Submitting" : "Submit deliverable"}
      </button>
      <TxStatus state={tx.state} />
    </form>
  );
}

function AdjudicateForm({ wallet, onChange }: { wallet: WalletState; onChange: () => void }) {
  const tx = useTx(wallet);
  const [jobId, setJobId] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const ok = await tx.run("adjudicate", [Number(jobId)]);
    if (ok) onChange();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Intro title="Convene the AI panel">
        Anyone can adjudicate a job that has a submitted deliverable. Each validator grades the work and
        the escrow settles on consensus. This transaction runs a language model, so it takes longer than
        a plain write.
      </Intro>
      <Field label="Job ID" value={jobId} onChange={setJobId} placeholder="5" mono required />
      <button type="submit" disabled={tx.busy} className="btn-primary">
        <Scale size={15} />
        {tx.busy ? "Convening the panel" : "Adjudicate"}
      </button>
      <TxStatus state={tx.state} />
    </form>
  );
}

function CancelForm({ wallet, onChange }: { wallet: WalletState; onChange: () => void }) {
  const tx = useTx(wallet);
  const [jobId, setJobId] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const ok = await tx.run("cancel_job", [Number(jobId)]);
    if (ok) onChange();
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Intro title="Cancel an open job">
        The client can reclaim the full deposit while a job is still open and no deliverable has been
        submitted. The connected wallet must be the client.
      </Intro>
      <Field label="Job ID" value={jobId} onChange={setJobId} placeholder="1" mono required />
      <button type="submit" disabled={tx.busy} className="btn-ghost border-reject/40 text-reject">
        <Ban size={15} />
        {tx.busy ? "Cancelling" : "Cancel and refund"}
      </button>
      <TxStatus state={tx.state} />
    </form>
  );
}

/* ---- form primitives ---- */

function Intro({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-ink/15 pb-3">
      <h3 className="font-serif text-xl">{title}</h3>
      <p className="mt-1 font-sans text-sm text-ink-soft">{children}</p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  mono,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <input
        className={`field ${mono ? "font-mono" : ""}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <textarea
        className="field resize-y"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        required={required}
      />
    </label>
  );
}
