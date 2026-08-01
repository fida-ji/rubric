// Small, dependency-free formatting helpers.

/** Format a wei amount (string or bigint) as a trimmed GEN string. */
export function fmtGen(wei: string | bigint | number, maxFractionDigits = 4): string {
  let v: bigint;
  try {
    v = typeof wei === "bigint" ? wei : BigInt(typeof wei === "number" ? Math.round(wei) : wei || "0");
  } catch {
    return "0";
  }
  const base = 10n ** 18n;
  const whole = v / base;
  const frac = v % base;
  if (frac === 0n) return whole.toString();
  let fracStr = frac.toString().padStart(18, "0").slice(0, maxFractionDigits);
  fracStr = fracStr.replace(/0+$/, "");
  return fracStr ? `${whole}.${fracStr}` : whole.toString();
}

/** Parse a decimal GEN string into a wei bigint. */
export function parseGen(amount: string): bigint {
  const trimmed = (amount || "").trim();
  if (!trimmed || isNaN(Number(trimmed))) return 0n;
  const [whole, frac = ""] = trimmed.split(".");
  const fracPadded = (frac + "0".repeat(18)).slice(0, 18);
  return BigInt(whole || "0") * 10n ** 18n + BigInt(fracPadded || "0");
}

/** Shorten a 0x address for display. */
export function shortAddr(addr?: string, lead = 6, tail = 4): string {
  if (!addr) return "";
  if (addr.length <= lead + tail) return addr;
  return `${addr.slice(0, lead)}…${addr.slice(-tail)}`;
}

/** Format a unix-seconds timestamp as a short UTC date. */
export function fmtDate(unixSeconds: number): string {
  if (!unixSeconds) return "not set";
  const d = new Date(unixSeconds * 1000);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function eqAddr(a?: string, b?: string): boolean {
  return !!a && !!b && a.toLowerCase() === b.toLowerCase();
}
