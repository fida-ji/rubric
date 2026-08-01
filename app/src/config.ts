// Central configuration for the Rubric app.
//
// The deployed contract address is read from VITE_CONTRACT_ADDRESS when present
// (set it as a Netlify Site environment variable), and otherwise falls back to
// the address baked in below so the hosted site works with no configuration.

const BAKED_CONTRACT_ADDRESS = "0x5688061Df3b231cdF3D4703b8D9cC7234723D2A8";

export const CONTRACT_ADDRESS = (
  (import.meta.env.VITE_CONTRACT_ADDRESS as string | undefined)?.trim() ||
  BAKED_CONTRACT_ADDRESS
) as `0x${string}`;

// GenLayer Testnet Bradbury (matches genlayer-js/chains: testnetBradbury).
export const BRADBURY = {
  chainIdDec: 4221,
  chainIdHex: "0x107d",
  chainName: "Genlayer Bradbury Testnet",
  rpcUrl: "https://rpc-bradbury.genlayer.com",
  explorer: "https://explorer-bradbury.genlayer.com",
  currency: { name: "GEN Token", symbol: "GEN", decimals: 18 },
} as const;

export const FAUCET_URL = "https://testnet-faucet.genlayer.foundation";

export const txUrl = (hash: string) => `${BRADBURY.explorer}/tx/${hash}`;
export const addrUrl = (address: string) => `${BRADBURY.explorer}/address/${address}`;

// Job lifecycle statuses used by the contract.
export const STATUS = {
  OPEN: "OPEN",
  SUBMITTED: "SUBMITTED",
  ACCEPTED: "ACCEPTED",
  PARTIAL: "PARTIAL",
  REJECTED: "REJECTED",
  CANCELLED: "CANCELLED",
} as const;
