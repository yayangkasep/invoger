/**
 * Helper to generate random invoice numbers within a numeric range.
 * Accepts inputs like: 123, 789 or '123-789'
 */

export interface RandomInvoiceOptions {
  count?: number; // default 1
  unique?: boolean; // attempt to make values unique
  sort?: "asc" | "desc" | null;
  pad?: number | null; // pad numbers with leading zeros to length
  prefix?: string; // optional prefix to each invoice string
  asString?: boolean; // return string values (with pad/prefix) instead of numbers
}

function parseRangeInput(input: string | number | [number, number]) {
  if (typeof input === "number") return { min: input, max: input };
  if (Array.isArray(input)) {
    const [a, b] = input;
    return { min: Math.min(a, b), max: Math.max(a, b) };
  }
  // string: try `a-b` or single number
  const dash = input.indexOf("-");
  if (dash >= 0) {
    const a = Number(input.slice(0, dash).trim());
    const b = Number(input.slice(dash + 1).trim());
    if (!Number.isFinite(a) || !Number.isFinite(b))
      throw new Error(`Invalid range: ${input}`);
    return { min: Math.min(a, b), max: Math.max(a, b) };
  }
  const n = Number(input.trim());
  if (!Number.isFinite(n)) throw new Error(`Invalid number: ${input}`);
  return { min: n, max: n };
}

export function randomInvoiceBetween(min: number, max: number) {
  if (!Number.isFinite(min) || !Number.isFinite(max))
    throw new Error("min/max must be numbers");
  if (max < min) [min, max] = [max, min];
  const range = max - min + 1;
  return Math.floor(Math.random() * range) + min;
}

export function formatInvoiceValue(
  value: number,
  pad?: number | null,
  prefix?: string,
) {
  let s = String(value);
  if (typeof pad === "number" && pad > 0) {
    s = s.padStart(pad, "0");
  }
  if (prefix) s = `${prefix}${s}`;
  return s;
}

export function randomInvoices(
  range: string | number | [number, number],
  opts: RandomInvoiceOptions = {},
) {
  const { min, max } = parseRangeInput(range);
  const {
    count = 1,
    unique = false,
    sort = null,
    pad = null,
    prefix = "",
    asString = false,
  } = opts;
  if (count <= 0) return [];
  const results: number[] = [];
  const maxUnique = max - min + 1;
  const attemptsLimit = Math.max(1000, count * 10);
  let attempts = 0;
  while (results.length < count && attempts < attemptsLimit) {
    attempts++;
    const v = randomInvoiceBetween(min, max);
    if (unique) {
      if (results.includes(v)) continue;
    }
    results.push(v);
    if (unique && results.length >= maxUnique) break; // cannot exceed unique possibilities
  }
  if (sort === "asc") results.sort((a, b) => a - b);
  if (sort === "desc") results.sort((a, b) => b - a);
  if (asString) return results.map((n) => formatInvoiceValue(n, pad, prefix));
  return results;
}

export default randomInvoices;
