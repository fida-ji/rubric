import { Check, CircleSlash, Minus, Clock, FileText, Ban } from "lucide-react";
import { STATUS } from "../config";

type Style = { label: string; cls: string; icon: JSX.Element };

const VERDICT_STYLE: Record<string, Style> = {
  accept: {
    label: "Accepted",
    cls: "border-accept/40 text-accept bg-accept/5",
    icon: <Check size={13} strokeWidth={2.5} />,
  },
  partial: {
    label: "Partial",
    cls: "border-partial/40 text-partial bg-partial/5",
    icon: <Minus size={13} strokeWidth={2.5} />,
  },
  reject: {
    label: "Rejected",
    cls: "border-reject/40 text-reject bg-reject/5",
    icon: <CircleSlash size={13} strokeWidth={2.5} />,
  },
};

export function VerdictBadge({ verdict }: { verdict: string }) {
  const s = VERDICT_STYLE[verdict];
  if (!s) return null;
  return (
    <span className={`tag ${s.cls} animate-stampin`}>
      {s.icon}
      {s.label}
    </span>
  );
}

const STATUS_STYLE: Record<string, Style> = {
  [STATUS.OPEN]: {
    label: "Open",
    cls: "border-structure/40 text-structure bg-structure/5",
    icon: <FileText size={13} />,
  },
  [STATUS.SUBMITTED]: {
    label: "Awaiting panel",
    cls: "border-partial/40 text-partial bg-partial/5",
    icon: <Clock size={13} />,
  },
  [STATUS.ACCEPTED]: {
    label: "Accepted",
    cls: "border-accept/40 text-accept bg-accept/5",
    icon: <Check size={13} strokeWidth={2.5} />,
  },
  [STATUS.PARTIAL]: {
    label: "Partial",
    cls: "border-partial/40 text-partial bg-partial/5",
    icon: <Minus size={13} strokeWidth={2.5} />,
  },
  [STATUS.REJECTED]: {
    label: "Rejected",
    cls: "border-reject/40 text-reject bg-reject/5",
    icon: <CircleSlash size={13} strokeWidth={2.5} />,
  },
  [STATUS.CANCELLED]: {
    label: "Cancelled",
    cls: "border-ink/30 text-ink-faint bg-ink/5",
    icon: <Ban size={13} />,
  },
};

export function StatusTag({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? {
    label: status,
    cls: "border-ink/30 text-ink-faint",
    icon: <FileText size={13} />,
  };
  return (
    <span className={`tag ${s.cls}`}>
      {s.icon}
      {s.label}
    </span>
  );
}
