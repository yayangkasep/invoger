import { defaultPaymentMethods, PaymentMethod, computePaymentForMethod } from './payments';

export interface RandomPaymentsOpts {
  methods?: Array<PaymentMethod | string>; // list of non-cash methods to use (PaymentMethod or methodId string)
  includeCash?: boolean; // allow cash payments
  cashRoundingStep?: number; // round cash payments up to nearest step (default 10000)
  unique?: boolean; // ensure unique paidAmount values when possible
}

export interface PaymentEntry {
  methodId: string;
  paidAmount: number; // gross amount given by customer
}

function roundUp(value: number, step: number) {
  if (step <= 0) return value;
  return Math.ceil(value / step) * step;
}

/**
 * Generate randomized payment entries for mass-printing.
 * - Ensures paidAmount values are unique when possible.
 * - Cash payments are rounded up to a friendly denomination (cashRoundingStep) so change exists.
 * - Card payments use computePaymentForMethod to include surcharge where applicable.
 */
export function generateRandomPayments(due: number, count: number, opts: RandomPaymentsOpts = {}): PaymentEntry[] {
  const { methods = defaultPaymentMethods, includeCash = true, cashRoundingStep = 10000, unique = true } = opts;
  if (count <= 0) return [];

  // normalize provided methods into PaymentMethod[] (exclude 'Cash' here)
  const normalizedMethods: PaymentMethod[] = (methods as Array<PaymentMethod | string>).map((m) => {
    if (typeof m === 'string') {
      const found = defaultPaymentMethods.find((dm) => dm.id === m || dm.label === m);
      if (found) return found;
      return { id: m, label: String(m) } as PaymentMethod;
    }
    return m as PaymentMethod;
  });

  // build a pool of method identifiers (strings), include 'Cash' if requested
  const pool: string[] = [];
  if (includeCash) pool.push('Cash');
  for (const m of normalizedMethods) {
    if (!pool.includes(m.id)) pool.push(m.id);
  }

  // cap count when unique methods requested
  let effectiveCount = count;
  if (unique && effectiveCount > pool.length) effectiveCount = pool.length;

  // shuffle pool
  const shuffled = pool.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const selectedMethods: string[] = unique ? shuffled.slice(0, effectiveCount) : Array.from({ length: count }, () => pool[Math.floor(Math.random() * pool.length)]);

  const out: PaymentEntry[] = [];
  const seen = new Set<number>();

  const makeUnique = (base: number) => {
    let attempts = 0;
    let cur = Math.round(base);
    const maxAttempts = 1000;
    while (unique && seen.has(cur) && attempts < maxAttempts) {
      attempts++;
      cur += Math.max(1, Math.round(cashRoundingStep));
    }
    seen.add(cur);
    return cur;
  };

  for (let i = 0; i < selectedMethods.length; i++) {
    const methodId = selectedMethods[i];

    if (methodId === 'Cash') {
      const base = roundUp(due, cashRoundingStep);
      const extraSteps = Math.floor(Math.random() * 3);
      const candidate = base + extraSteps * cashRoundingStep + i * Math.floor(cashRoundingStep / 10);
      const paid = makeUnique(candidate);
      out.push({ methodId: 'Cash', paidAmount: paid });
      continue;
    }

    const methodObj = normalizedMethods.find((m) => m.id === methodId) || ({ id: methodId, label: methodId } as PaymentMethod);
    const computed = computePaymentForMethod(due, methodObj);
    let paidCandidate = computed.gross;
    if (unique) paidCandidate += Math.floor(Math.random() * Math.max(1, Math.round(cashRoundingStep / 10)));
    const paid = makeUnique(paidCandidate);
    out.push({ methodId: methodObj.id, paidAmount: paid });
  }

  return out;
}

export default generateRandomPayments;
