import { Loader2, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import { txUrl } from "../config";
import type { TxPhase } from "../lib/genlayer";

export type TxState = {
  phase: TxPhase;
  hash?: string;
  message?: string;
};

const PHASE_TEXT: Record<TxPhase, string> = {
  idle: "",
  signing: "Waiting for your wallet signature",
  pending: "Submitted. Validators are reaching consensus",
  accepted: "Accepted by consensus",
  error: "Transaction failed",
};

export function TxStatus({ state }: { state: TxState }) {
  if (state.phase === "idle") return null;
  const explorer = state.hash ? txUrl(state.hash) : null;

  return (
    <div
      className={`mt-3 flex items-start gap-2.5 rounded border px-3 py-2.5 text-sm animate-fadeup ${
        state.phase === "error"
          ? "border-reject/40 bg-reject/5 text-reject"
          : state.phase === "accepted"
            ? "border-accept/40 bg-accept/5 text-accept"
            : "border-partial/40 bg-partial/5 text-ink-soft"
      }`}
    >
      <span className="mt-0.5 shrink-0">
        {state.phase === "accepted" ? (
          <CheckCircle2 size={16} />
        ) : state.phase === "error" ? (
          <XCircle size={16} />
        ) : (
          <Loader2 size={16} className="animate-spin" />
        )}
      </span>
      <div className="min-w-0">
        <div className="font-medium">{state.message || PHASE_TEXT[state.phase]}</div>
        {explorer && (
          <a
            href={explorer}
            target="_blank"
            rel="noreferrer"
            className="mono mt-0.5 inline-flex items-center gap-1 break-all text-structure"
          >
            {state.hash}
            <ExternalLink size={12} className="shrink-0" />
          </a>
        )}
      </div>
    </div>
  );
}
