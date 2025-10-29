/**
 * Member loyalty helper
 *
 * Rules:
 * - 1 point for every 200,000 IDR spent
 * - 2 points for 400,000 IDR, and so on (points = floor(amount / 200000))
 */

export interface MemberPointsResult {
  amount: number; // input amount (rupiah)
  points: number; // earned points
  pointsValue: number; // rupiah equivalent of points (points * 200000)
  nextThreshold: number; // rupiah needed to reach next point (0 if already at exact multiple)
}

const POINT_VALUE_RUPIAH = 200_000;

export function computeMemberPoints(amount: number): number {
  const n = Number(amount) || 0;
  if (n <= 0) return 0;
  return Math.floor(n / POINT_VALUE_RUPIAH);
}

export function pointsToRupiah(points: number): number {
  const p = Math.max(0, Math.floor(Number(points) || 0));
  return p * POINT_VALUE_RUPIAH;
}

export function nextThreshold(amount: number): number {
  const n = Math.max(0, Number(amount) || 0);
  const points = computeMemberPoints(n);
  const nextNeeded = (points + 1) * POINT_VALUE_RUPIAH - n;
  return nextNeeded > 0 ? nextNeeded : 0;
}

export function summarizeMemberPoints(amount: number): MemberPointsResult {
  const pts = computeMemberPoints(amount);
  return {
    amount: Number(amount) || 0,
    points: pts,
    pointsValue: pointsToRupiah(pts),
    nextThreshold: nextThreshold(amount),
  };
}

export default {
  computeMemberPoints,
  pointsToRupiah,
  nextThreshold,
  summarizeMemberPoints,
};
