import { Mark } from "./Mark";
import { CONTRACT_ADDRESS, BRADBURY, addrUrl } from "../config";
import { shortAddr } from "../lib/format";

export function Footer() {
  return (
    <footer className="border-t border-ink/15 bg-paper-raised/60">
      <div className="wrap grid gap-8 py-12 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2 text-ink">
            <Mark size={24} />
            <span className="font-serif text-lg" style={{ fontWeight: 600 }}>
              Rubric
            </span>
          </div>
          <p className="mt-3 max-w-sm font-sans text-sm leading-relaxed text-ink-soft">
            Escrow for creative work, settled by a decentralized AI panel on GenLayer. The brief is the
            contract; the verdict moves the money.
          </p>
        </div>

        <div>
          <div className="eyebrow">Explore</div>
          <ul className="mt-3 space-y-2 font-sans text-sm">
            <li><a href="#how">How it works</a></li>
            <li><a href="#ledger">Live ledger</a></li>
            <li><a href="#console">Console</a></li>
            <li><a href="#docs">Reference</a></li>
          </ul>
        </div>

        <div>
          <div className="eyebrow">On-chain</div>
          <ul className="mt-3 space-y-2 font-sans text-sm">
            <li>
              <a href={addrUrl(CONTRACT_ADDRESS)} target="_blank" rel="noreferrer" className="mono">
                {shortAddr(CONTRACT_ADDRESS, 8, 6)}
              </a>
            </li>
            <li>
              <a href={BRADBURY.explorer} target="_blank" rel="noreferrer">
                Bradbury explorer
              </a>
            </li>
            <li>
              <a href="https://docs.genlayer.com" target="_blank" rel="noreferrer">
                GenLayer docs
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-ink/10">
        <div className="wrap flex flex-col items-center justify-between gap-2 py-5 sm:flex-row">
          <p className="font-mono text-xs text-ink-faint">
            {BRADBURY.chainName} · chain id {BRADBURY.chainIdDec}
          </p>
          <p className="font-mono text-xs text-ink-faint">Testnet only. GEN has no monetary value.</p>
        </div>
      </div>
    </footer>
  );
}
