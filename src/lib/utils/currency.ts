/**
 * Simple IDR currency helpers — format numbers with comma thousands separator
 * and no decimal places. Example: 100000 -> "100,000"
 */

export interface FormatIDROptions {
  prefix?: string | null; // e.g. 'Rp '
  allowNegative?: boolean; // keep negative sign if present
}

export function formatIDR(value: number | string, opts: FormatIDROptions = {}) {
  const { prefix = null, allowNegative = true } = opts;
  let n: number;
  if (typeof value === "string") {
    // remove non-digit except leading minus and decimals
    const cleaned = value.replace(/[^0-9.-]+/g, "");
    n = Number(cleaned || 0);
  } else {
    n = value;
  }
  if (!Number.isFinite(n) || Number.isNaN(n)) return "";
  const negative = n < 0;
  const abs = Math.abs(Math.trunc(n)); // drop decimals
  const s = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const result = (negative && allowNegative ? "-" : "") + s;
  return prefix ? `${prefix}${result}` : result;
}

export function parseIDR(text: string) {
  if (!text) return 0;
  const cleaned = text.replace(/[^0-9-]+/g, "");
  const n = Number(cleaned || 0);
  return Number.isFinite(n) ? n : 0;
}

export default formatIDR;
