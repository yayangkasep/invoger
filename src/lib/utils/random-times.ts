/**
 * Utilities to generate random times between two clock boundaries (HH:MM)
 * Default range: 09:00 - 21:00
 */

export type TimeString = `${string}:${string}`;

function parseHHMM(value: TimeString) {
  const [hh, mm] = value.split(":").map((v) => Number(v));
  if (!Number.isFinite(hh) || !Number.isFinite(mm))
    throw new Error(`Invalid time: ${value}`);
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59)
    throw new Error(`Invalid time range: ${value}`);
  return { hours: hh, minutes: mm };
}

function toDateWithinToday(hh: number, mm: number) {
  const d = new Date();
  d.setHours(hh, mm, 0, 0);
  return d;
}

/**
 * Format Date to HH:MM (24-hour) string
 */
export function formatTimeHHMM(d: Date) {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

/**
 * Generate a single random Date between start (inclusive) and end (exclusive) on the same day.
 * start/end accept strings like '09:00' or '21:00'. Defaults are '09:00'..'21:00'.
 */
export function randomTimeBetween(
  start: TimeString = "09:00",
  end: TimeString = "21:00",
) {
  const s = parseHHMM(start);
  const e = parseHHMM(end);
  const startDate = toDateWithinToday(s.hours, s.minutes).getTime();
  const endDate = toDateWithinToday(e.hours, e.minutes).getTime();
  if (endDate <= startDate) throw new Error("end must be after start");
  const rand = Math.floor(Math.random() * (endDate - startDate)) + startDate;
  return new Date(rand);
}

export interface RandomTimesOptions {
  count?: number; // number of times to generate (default 1)
  unique?: boolean; // try to ensure unique times (not guaranteed for high counts)
  sort?: "asc" | "desc" | null; // whether to sort output
  asString?: boolean; // return as 'HH:MM' strings instead of Date
}

/**
 * Generate multiple random times between start and end.
 * Returns Date[] by default, or string[] if asString=true.
 */
export function randomTimes(
  start: TimeString = "09:00",
  end: TimeString = "21:00",
  opts: RandomTimesOptions = {},
) {
  const { count = 1, unique = false, sort = null, asString = false } = opts;
  if (count <= 0) return [];
  // We'll treat uniqueness differently depending on the requested output.
  // When returning strings (HH:MM) we must ensure uniqueness at minute resolution
  // because formatTimeHHMM truncates seconds. For Date[] output, uniqueness is
  // enforced on the full millisecond timestamp.
  const results: Date[] = [];

  // compute discrete slot count (minutes) between start and end to reason about max possible unique values
  const s = parseHHMM(start);
  const e = parseHHMM(end);
  const startMs = toDateWithinToday(s.hours, s.minutes).getTime();
  const endMs = toDateWithinToday(e.hours, e.minutes).getTime();
  const totalMs = endMs - startMs;
  if (totalMs <= 0) throw new Error('end must be after start');
  const totalMinutes = Math.floor(totalMs / 60000);

  // If unique requested and user asked for more items than unique minute slots (when asString)
  // or more than millisecond slots (practically infinite) we should cap to possible unique minutes when asString.
  let effectiveCount = count;
  if (unique && asString) {
    if (effectiveCount > totalMinutes) effectiveCount = totalMinutes;
  }

  // attempt limits: allow more attempts for larger counts
  const attemptsLimit = Math.max(2000, effectiveCount * 50, Math.min(100000, totalMinutes * 2));
  let attempts = 0;

  const seen = new Set<number | string>();
  while (results.length < effectiveCount && attempts < attemptsLimit) {
    attempts++;
    const t = randomTimeBetween(start, end);

    if (unique) {
      if (asString) {
        // check uniqueness on HH:MM string (minute resolution)
        const key = formatTimeHHMM(t);
        if (seen.has(key)) continue;
        seen.add(key);
      } else {
        const key = t.getTime();
        if (seen.has(key)) continue;
        seen.add(key);
      }
    }

    results.push(t);
  }
  if (results.length < count) {
    // couldn't satisfy unique constraint — return what we have (this mirrors random-invoice behaviour)
  }
  if (sort === "asc") results.sort((a, b) => a.getTime() - b.getTime());
  if (sort === "desc") results.sort((a, b) => b.getTime() - a.getTime());
  return asString ? results.map(formatTimeHHMM) : results;
}

export default randomTimes;
