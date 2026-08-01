import { useCallback, useState } from "react";
import { sendTx } from "./genlayer";
import type { TxState } from "../components/TxStatus";
import type { WalletState } from "./wallet";

/** Manages the lifecycle state for a single write transaction. */
export function useTx(wallet: WalletState) {
  const [state, setState] = useState<TxState>({ phase: "idle" });
  const [busy, setBusy] = useState(false);

  const reset = useCallback(() => setState({ phase: "idle" }), []);

  const run = useCallback(
    async (
      functionName: string,
      args: any[],
      value: bigint = 0n,
    ): Promise<boolean> => {
      if (!wallet.provider || !wallet.address) {
        setState({ phase: "error", message: "Connect your wallet first." });
        return false;
      }
      if (!wallet.onBradbury) {
        try {
          await wallet.switchToBradbury();
        } catch {
          setState({ phase: "error", message: "Switch to the Bradbury network to continue." });
          return false;
        }
      }
      setBusy(true);
      setState({ phase: "signing" });
      try {
        await sendTx({
          provider: wallet.provider,
          address: wallet.address,
          functionName,
          args,
          value,
          onHash: (hash) =>
            setState({
              phase: "pending",
              hash,
              message: "Submitted. Validators are reaching consensus",
            }),
        });
        setState((s) => ({ phase: "accepted", hash: s.hash, message: "Accepted by consensus" }));
        return true;
      } catch (e: any) {
        const raw = String(e?.message || e || "Transaction failed");
        // Surface the contract's business error prefix in a readable way.
        const clean = raw.replace(/\[EXPECTED\]|\[LLM_ERROR\]/g, "").trim();
        setState((s) => ({ phase: "error", hash: s.hash, message: clean.slice(0, 240) }));
        return false;
      } finally {
        setBusy(false);
      }
    },
    [wallet],
  );

  return { state, busy, run, reset };
}
