import { parseIDR, formatIDR } from "./currency";

export interface LineItem {
  id?: string | number;
  label?: string;
  qty: number;
  // price can be number (raw) or string like '1,000'
  price: number | string;
}

export interface TotalsResult {
  totalItems: number; // number of distinct line items
  totalQuantity: number; // sum of qty
  totalRupiah: number; // sum of (qty * price)
  formattedTotal?: string; // formatted using formatIDR
}

export function computeLineTotal(item: LineItem) {
  const qty = Number(item.qty) || 0;
  const price =
    typeof item.price === "number" ? item.price : parseIDR(String(item.price));
  const total = qty * price;
  return total;
}

export function computeTotals(
  items: LineItem[],
  opts?: { format?: boolean; prefix?: string | null },
): TotalsResult {
  const totalItems = items.length;
  let totalQuantity = 0;
  let totalRupiah = 0;
  for (const it of items) {
    const qty = Number(it.qty) || 0;
    const price =
      typeof it.price === "number" ? it.price : parseIDR(String(it.price));
    totalQuantity += qty;
    totalRupiah += qty * price;
  }
  const res: TotalsResult = {
    totalItems,
    totalQuantity,
    totalRupiah,
  };
  if (opts?.format) {
    res.formattedTotal = formatIDR(totalRupiah, {
      prefix: opts.prefix ?? null,
    });
  }
  return res;
}

export default computeTotals;
