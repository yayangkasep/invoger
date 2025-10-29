import { parseIDR, formatIDR } from './currency';
import { fetchWithAuthClient } from '@/lib/auth/client';

export interface PromotionShape {
  id: string;
  name?: string;
  code?: string;
  promoText?: string;
  type?: string; // 'by%' | 'discount' | 'buy2'
  value?: number; // percent or nominal for single-unit
  minQty?: number; // for buy2
  price?: number; // per-unit when qty >= minQty for buy2
  discount?: number; // legacy
  active?: boolean;
}

async function fetchPromotionsFromApi(): Promise<PromotionShape[]> {
  try {
    const res = await fetchWithAuthClient('/api/promotion');
    if (!res.ok) return [];
    const body = await res.json().catch(() => ({}));
    const items = Array.isArray(body?.promotions) ? body.promotions : [];
    return items.map((p: any) => ({
      id: String(p.id),
      name: p.name ?? p.Name ?? '',
      code: p.code ?? p.Code ?? undefined,
      promoText: p.promoText ?? p.code ?? undefined,
      type: p.type ?? undefined,
      value: typeof p.value === 'number' ? p.value : typeof p.discount === 'number' ? p.discount : undefined,
      minQty: typeof p.minQty === 'number' ? p.minQty : undefined,
      price: typeof p.price === 'number' ? p.price : undefined,
      discount: typeof p.discount === 'number' ? p.discount : undefined,
      active: typeof p.active === 'boolean' ? p.active : true,
    }));
  } catch (e) {
    console.error('Failed to fetch promotions', e);
    return [];
  }
}

/**
 * Find a promotion by name (exact or partial match) or by promoText/code that contains the query.
 */
export async function findPromotionByName(query: string): Promise<PromotionShape | null> {
  if (!query) return null;
  const q = String(query).trim().toLowerCase();
  const promos = await fetchPromotionsFromApi();
  if (!promos.length) return null;
  // prefer exact name match
  const exact = promos.find((p) => String(p.name || '').toLowerCase() === q);
  if (exact) return exact;
  // then partial name match
  const partial = promos.find((p) => String(p.name || '').toLowerCase().includes(q));
  if (partial) return partial;
  // then search in promoText or code
  const txt = promos.find((p) => String(p.promoText || '').toLowerCase().includes(q) || String(p.code || '').toLowerCase().includes(q));
  return txt ?? null;
}

/**
 * Find a promotion by id.
 */
export async function findPromotionById(id: string): Promise<PromotionShape | null> {
  if (!id) return null;
  try {
    const promos = await fetchPromotionsFromApi();
    if (!promos || !promos.length) return null;
    const found = promos.find((p) => String(p.id) === String(id));
    return found ?? null;
  } catch (e) {
    return null;
  }
}

/**
 * Compute per-unit price according to promotion and selected qty.
 * - buy2: promo.value = price for single unit, promo.price = per-unit price when qty >= minQty
 * - by%: promo.value is percent discount
 * - discount: promo.value is nominal discount per unit
 */
export function computeUnitPriceForPromotion(promo: PromotionShape | null, qty: number, basePrice: number) {
  const bp = typeof basePrice === 'number' ? basePrice : parseIDR(String(basePrice || 0));
  if (!promo) return bp;

  if (promo.type === 'buy2') {
    const minQty = typeof promo.minQty === 'number' && promo.minQty > 0 ? promo.minQty : 2;
    if (qty >= minQty) {
      // prefer a nominal per-unit discount value (promo.value) applied to the original price
      if (typeof promo.value === 'number') {
        return Math.max(0, bp - promo.value);
      }
      // fallback: if a fixed per-unit price is provided, use it
      if (typeof promo.price === 'number') return promo.price;
      return bp;
    }
    return bp;
  }

  if (promo.type === 'by%') {
    const pct = typeof promo.value === 'number' ? promo.value : typeof promo.discount === 'number' ? promo.discount : 0;
    return Math.round(bp * (100 - pct) / 100);
  }

  if (promo.type === 'discount') {
    const amt = typeof promo.value === 'number' ? promo.value : 0;
    return Math.max(0, bp - amt);
  }

  // fallback: if promo contains value (nominal), use it as unit price
  if (typeof promo.value === 'number') return promo.value;

  return bp;
}

export function computePromotionAdjustment(promo: PromotionShape | null, qty: number, basePrice: number) {
  const bp = typeof basePrice === 'number' ? basePrice : parseIDR(String(basePrice || 0));
  if (!promo) {
    return {
      promo: null,
      promoName: null,
      promoText: null,
      unitPrice: bp,
      discountPerUnit: 0,
      totalDiscount: 0,
      formattedUnitPrice: formatIDR(bp),
      formattedDiscountPerUnit: formatIDR(0),
      formattedTotalDiscount: formatIDR(0),
    };
  }

  let unitPrice = bp;
  let discountPerUnit = 0;

  // percent-based promo
  if (promo.type === 'by%') {
    const pct = typeof promo.value === 'number' ? promo.value : typeof promo.discount === 'number' ? promo.discount : 0;
    unitPrice = Math.round(bp * (100 - pct) / 100);
    discountPerUnit = Math.max(0, bp - unitPrice);
  } else if (promo.type === 'buy2') {
    const minQty = typeof promo.minQty === 'number' && promo.minQty > 0 ? promo.minQty : 2;
    if (qty >= minQty) {
      // prefer nominal discount per unit (promo.value)
      if (typeof promo.value === 'number') {
        discountPerUnit = Math.max(0, promo.value);
        unitPrice = Math.max(0, bp - discountPerUnit);
      } else if (typeof promo.price === 'number') {
        // legacy/fallback: explicit per-unit price for bulk
        unitPrice = promo.price;
        discountPerUnit = Math.max(0, bp - unitPrice);
      } else {
        unitPrice = computeUnitPriceForPromotion(promo, qty, bp);
        discountPerUnit = Math.max(0, bp - unitPrice);
      }
    } else {
      // qty below threshold: no discount applied
      unitPrice = bp;
      discountPerUnit = 0;
    }
  } else {
    // discount or default: if promo.value present treat as nominal discount per unit
    if (typeof promo.value === 'number') {
      discountPerUnit = promo.value;
      unitPrice = Math.max(0, bp - discountPerUnit);
    } else if (typeof promo.discount === 'number') {
      // legacy field
      discountPerUnit = promo.discount;
      unitPrice = Math.max(0, bp - discountPerUnit);
    } else {
      unitPrice = computeUnitPriceForPromotion(promo, qty, bp);
      discountPerUnit = Math.max(0, bp - unitPrice);
    }
  }

  const totalDiscount = discountPerUnit * qty;
  return {
    promo: promo ?? null,
    promoName: promo?.name ?? null,
    promoText: promo?.promoText ?? promo?.code ?? null,
    unitPrice,
    discountPerUnit,
    totalDiscount,
    formattedUnitPrice: formatIDR(unitPrice),
    formattedDiscountPerUnit: formatIDR(discountPerUnit),
    formattedTotalDiscount: formatIDR(totalDiscount),
  };
}

/**
 * Convenience: find a promotion by name and compute its adjustment for the given item/qty/basePrice.
 */
export async function applyPromotionByName(name: string, qty: number, basePrice: number) {
  const promo = await findPromotionByName(name);
  return computePromotionAdjustment(promo, qty, basePrice);
}

export default {
  findPromotionById,
  findPromotionByName,
  computeUnitPriceForPromotion,
  computePromotionAdjustment,
  applyPromotionByName,
};
