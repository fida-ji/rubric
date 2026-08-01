// A small injected-wallet connector (EIP-1193). Handles the full lifecycle:
// connect, disconnect, account changes, chain changes, and switching or adding
// the Bradbury chain. It does not require MetaMask Snaps.
import { useCallback, useEffect, useState } from "react";
import { BRADBURY } from "../config";

type Eip1193 = {
  request: (args: { method: string; params?: any[] | object }) => Promise<any>;
  on?: (event: string, handler: (...a: any[]) => void) => void;
  removeListener?: (event: string, handler: (...a: any[]) => void) => void;
};

declare global {
  interface Window {
    ethereum?: Eip1193 & { providers?: Eip1193[] };
  }
}

/** Prefer an injected provider; if several are present, keep the first. */
function getInjectedProvider(): Eip1193 | null {
  const eth = window.ethereum;
  if (!eth) return null;
  if (Array.isArray(eth.providers) && eth.providers.length > 0) return eth.providers[0];
  return eth;
}

export type WalletState = {
  provider: Eip1193 | null;
  address: string | null;
  chainId: string | null;
  onBradbury: boolean;
  hasWallet: boolean;
  connecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchToBradbury: () => Promise<void>;
};

export function useWallet(): WalletState {
  const [provider, setProvider] = useState<Eip1193 | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasWallet = typeof window !== "undefined" && !!window.ethereum;

  const refreshChain = useCallback(async (p: Eip1193) => {
    try {
      const cid = (await p.request({ method: "eth_chainId" })) as string;
      setChainId(cid);
    } catch {
      /* ignore */
    }
  }, []);

  const switchToBradbury = useCallback(async () => {
    const p = provider ?? getInjectedProvider();
    if (!p) return;
    try {
      await p.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: BRADBURY.chainIdHex }],
      });
    } catch (e: any) {
      // 4902 = chain not added yet; add it, then it becomes current.
      if (e?.code === 4902 || String(e?.message || "").includes("Unrecognized chain")) {
        await p.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: BRADBURY.chainIdHex,
              chainName: BRADBURY.chainName,
              nativeCurrency: BRADBURY.currency,
              rpcUrls: [BRADBURY.rpcUrl],
              blockExplorerUrls: [BRADBURY.explorer],
            },
          ],
        });
      } else {
        throw e;
      }
    }
    await refreshChain(p);
  }, [provider, refreshChain]);

  const connect = useCallback(async () => {
    setError(null);
    const p = getInjectedProvider();
    if (!p) {
      setError("No Ethereum wallet found. Install MetaMask, Rabby, or another injected wallet.");
      return;
    }
    setConnecting(true);
    try {
      const accounts = (await p.request({ method: "eth_requestAccounts" })) as string[];
      setProvider(p);
      setAddress(accounts?.[0] ?? null);
      await refreshChain(p);
      try {
        await switchToBradbury();
      } catch {
        /* user can switch manually via the banner */
      }
    } catch (e: any) {
      setError(e?.message || "Wallet connection was rejected.");
    } finally {
      setConnecting(false);
    }
  }, [refreshChain, switchToBradbury]);

  const disconnect = useCallback(() => {
    setAddress(null);
    // We intentionally keep the provider reference for chain reads, but clear
    // the session-facing state. Injected wallets have no true "disconnect".
  }, []);

  // Wire up account/chain change listeners on the active provider.
  useEffect(() => {
    const p = provider ?? getInjectedProvider();
    if (!p?.on) return;
    const onAccounts = (accounts: string[]) => setAddress(accounts?.[0] ?? null);
    const onChain = (cid: string) => setChainId(cid);
    p.on("accountsChanged", onAccounts);
    p.on("chainChanged", onChain);
    return () => {
      p.removeListener?.("accountsChanged", onAccounts);
      p.removeListener?.("chainChanged", onChain);
    };
  }, [provider]);

  const onBradbury = chainId?.toLowerCase() === BRADBURY.chainIdHex.toLowerCase();

  return {
    provider,
    address,
    chainId,
    onBradbury,
    hasWallet,
    connecting,
    error,
    connect,
    disconnect,
    switchToBradbury,
  };
}
