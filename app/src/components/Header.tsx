import { Wallet, Power, AlertTriangle } from "lucide-react";
import { Wordmark } from "./Mark";
import { shortAddr } from "../lib/format";
import type { WalletState } from "../lib/wallet";

const NAV = [
  { href: "#how", label: "How it works" },
  { href: "#ledger", label: "Live ledger" },
  { href: "#console", label: "Console" },
  { href: "#docs", label: "Docs" },
];

export function Header({ wallet }: { wallet: WalletState }) {
  const { address, onBradbury, connecting, connect, disconnect, switchToBradbury } = wallet;

  return (
    <header className="sticky top-0 z-30 border-b border-ink/15 bg-paper/85 backdrop-blur-sm">
      <div className="wrap flex h-16 items-center justify-between gap-4">
        <a href="#top" className="no-underline">
          <Wordmark />
        </a>

        <nav className="hidden items-center gap-7 md:flex">
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="font-sans text-sm text-ink-soft no-underline hover:text-ink"
            >
              {n.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {address && !onBradbury && (
            <button onClick={switchToBradbury} className="btn-ghost border-partial/50 text-partial">
              <AlertTriangle size={14} />
              Switch to Bradbury
            </button>
          )}
          {address ? (
            <div className="flex items-center gap-2">
              <span className="tag border-ink/20 text-ink-soft">
                <span className="h-1.5 w-1.5 rounded-full bg-accept" />
                {shortAddr(address)}
              </span>
              <button onClick={disconnect} className="btn-ghost" title="Disconnect">
                <Power size={14} />
              </button>
            </div>
          ) : (
            <button onClick={connect} disabled={connecting} className="btn-primary">
              <Wallet size={15} />
              {connecting ? "Connecting" : "Connect wallet"}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
