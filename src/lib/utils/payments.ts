import formatIDR from "./currency";

export type Surcharge =
  | { type: "percent"; value: number } // value = 2.5 means 2.5%
  | { type: "fixed"; value: number }; // fixed amount in rupiah

export interface PaymentMethod {
  id: string;
  label: string;
  surcharge?: Surcharge;
  enabled?: boolean;
}

export const defaultPaymentMethods: PaymentMethod[] = [
//   { id: "cash", label: "Cash" },
//   { id: "debit_bca", label: "Debit BCA" },
//   { id: "debit_mandiri", label: "Debit Mandiri" },
//   { id: "transfer_bca", label: "Transfer BCA" },
//   { id: "shopeepay", label: "ShopeePay" },
  { id: "master_visa", label: "Master Visa", surcharge: { type: "percent", value: 2 } },
  { id: "bca_card", label: "BCA CARD", surcharge: { type: "percent", value: 1 } },
];

export function findMethodById(id: string, methods: PaymentMethod[] = defaultPaymentMethods) {
  return methods.find((m) => m.id === id) || null;
}

/**
 * Apply surcharge rule to a base amount (due).
 * Returns gross amount (due + surcharge) and the surcharge value (rounded to integer).
 */
export function applySurcharge(amount: number, method?: PaymentMethod): { gross: number; surcharge: number } {
  if (!method || !method.surcharge) return { gross: amount, surcharge: 0 };
  const s = method.surcharge;
  if (s.type === "percent") {
    // round to nearest rupiah
    const surcharge = Math.round((amount * s.value) / 100);
    return { gross: amount + surcharge, surcharge };
  } else {
    const surcharge = Math.round(s.value);
    return { gross: amount + surcharge, surcharge };
  }
}

/**
 * Compute expected payment info for a single payment method given the invoice due amount.
 * - due: invoice amount (without surcharge)
 * - method: PaymentMethod object or undefined
 * Returns object with due, surcharge, gross and formatted labels.
 */
export function computePaymentForMethod(due: number, method?: PaymentMethod) {
  const { gross, surcharge } = applySurcharge(due, method);
  return {
    due,
    methodId: method?.id ?? "unknown",
    methodLabel: method?.label ?? "Unknown",
    surcharge,
    gross,
    formatted: {
      due: formatIDR(due),
      surcharge: formatIDR(surcharge),
      gross: formatIDR(gross),
    },
  };
}

export interface PaymentEntry {
  methodId: string;
  // paidAmount is the gross amount customer gives using this payment entry
  paidAmount: number;
}

/**
 * Compute multi-payment breakdown. Assumes `payments[].paidAmount` are gross amounts given by customer.
 * The function will allocate payments in order up to the due amount and compute change if totalPaid > due.
 */
export function computeMultiPaymentBreakdown(
  due: number,
  payments: PaymentEntry[],
  methods: PaymentMethod[] = defaultPaymentMethods,
) {
  let remainingDue = due;
  const breakdown = payments.map((p) => {
    const method = findMethodById(p.methodId, methods);
    const paid = Number(p.paidAmount) || 0;
    // Try to estimate surcharge portion: if method has surcharge, we compute surcharge based on portion applied to due
    // We'll treat `appliedDue` as the portion of the invoice this payment will cover (before surcharge)
    // Solve for appliedDue when gross = appliedDue + surcharge(appliedDue)
    let appliedDue = 0;
    let surcharge = 0;

    if (!method || !method.surcharge) {
      // no surcharge: entire paid amount counts towards due (but we cap to remainingDue)
      appliedDue = Math.min(remainingDue, paid);
      surcharge = 0;
    } else if (method.surcharge.type === "fixed") {
      // gross = appliedDue + fixedSurcharge
      const fixed = method.surcharge.value;
      // if paid <= fixed => appliedDue 0
      const possibleApplied = Math.max(0, paid - fixed);
      appliedDue = Math.min(remainingDue, possibleApplied);
      surcharge = appliedDue > 0 ? fixed : 0;
    } else {
      // percent surcharge: gross = appliedDue * (1 + pct/100)
      const pct = method.surcharge.value;
      // appliedDue = gross / (1 + pct/100)
      const divisor = 1 + pct / 100;
      const possibleApplied = Math.floor((paid / divisor) || 0);
      appliedDue = Math.min(remainingDue, possibleApplied);
      surcharge = Math.round(appliedDue * (pct / 100));
    }

    remainingDue = Math.max(0, remainingDue - appliedDue);

    return {
      methodId: p.methodId,
      methodLabel: method?.label ?? p.methodId,
      paidAmount: paid,
      appliedDue,
      surcharge,
      grossExpected: appliedDue + surcharge,
      formatted: {
        paidAmount: formatIDR(paid),
        appliedDue: formatIDR(appliedDue),
        surcharge: formatIDR(surcharge),
        grossExpected: formatIDR(appliedDue + surcharge),
      },
    };
  });

  const totalPaid = breakdown.reduce((s, b) => s + (b.paidAmount || 0), 0);
  return {
    due,
    totalPaid,
    change: Math.max(0, totalPaid - due),
    remainingDue: Math.max(0, due - totalPaid),
    breakdown,
  };
}

export default {
  defaultPaymentMethods,
  findMethodById,
  applySurcharge,
  computePaymentForMethod,
  computeMultiPaymentBreakdown,
};
