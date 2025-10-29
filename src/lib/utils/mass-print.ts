
/**
 * Mass-print helpers
 *
 * Purpose:
 * - Generate sequential invoice numbers preserving padding (e.g. SO-XXX.00001 -> 00002 ...)
 * - Generate strictly-increasing timestamps for each generated invoice so newer
 *   invoice numbers always have a later time.
 */

export type TimeString = `${string}:${string}`;

function parseHHMM(value: TimeString) {
	const [hh, mm] = value.split(":").map((v) => Number(v));
	if (!Number.isFinite(hh) || !Number.isFinite(mm)) throw new Error(`Invalid time: ${value}`);
	if (hh < 0 || hh > 23 || mm < 0 || mm > 59) throw new Error(`Invalid time: ${value}`);
	return { hours: hh, minutes: mm };
}

function atTime(base: Date, hh: number, mm: number) {
	const d = new Date(base);
	d.setHours(hh, mm, 0, 0);
	return d;
}

function pad(n: number, width: number) {
	return String(n).padStart(width, '0');
}

/**
 * Parse last numeric run in an invoice string.
 * Returns null when no numeric run found.
 */
export function parseNumericSuffix(invoice: string) {
	const rx = /(\d+)(?!.*\d)/; // last numeric run
	const m = rx.exec(invoice);
	if (!m) return null;
	const numStr = m[0];
	const idx = m.index ?? invoice.lastIndexOf(numStr);
	return {
		prefix: invoice.slice(0, idx),
		number: Number(numStr),
		pad: numStr.length,
		suffix: invoice.slice(idx + numStr.length),
	};
}

/**
 * Generate sequential invoice numbers. The first returned item equals baseInvoice.
 * If baseInvoice has no numeric suffix, a padded sequence with default width 5 is appended.
 */
export function generateInvoiceNumbers(baseInvoice: string, count: number) {
	if (count <= 0) return [];
	const parsed = parseNumericSuffix(baseInvoice);
	if (!parsed) {
		const width = 5;
		const out: string[] = [];
		for (let i = 0; i < count; i++) {
			out.push(`${baseInvoice}${pad(i + 1, width)}`);
		}
		return out;
	}
	const { prefix, number, pad: width, suffix } = parsed;
	const out: string[] = [];
	for (let i = 0; i < count; i++) {
		out.push(`${prefix}${pad(number + i, width)}${suffix}`);
	}
	return out;
}

export interface TimestampOpts {
	start?: TimeString; // default '09:00'
	end?: TimeString; // default '21:00'
	minIncrementSeconds?: number; // default 60 (1 minute)
	maxIncrementSeconds?: number; // default 300 (5 minutes)
}

/**
 * Generate strictly increasing timestamps for mass-print entries.
 * The first timestamp is baseDate clamped into [start,end]. Subsequent timestamps
 * are produced by adding a random increment between min/max seconds. If the candidate
 * exceeds the day's end bound, generation continues on the next day at start bound + small offset.
 */
export function generateTimestampSequence(baseDate: Date, count: number, opts: TimestampOpts = {}) {
	if (count <= 0) return [] as Date[];
	const { start = '09:00', end = '21:00', minIncrementSeconds = 60, maxIncrementSeconds = 300 } = opts;
	const s = parseHHMM(start);
	const e = parseHHMM(end);

	const out: Date[] = [];
	let current = new Date(baseDate);
	const dayStart = atTime(current, s.hours, s.minutes);
	const dayEnd = atTime(current, e.hours, e.minutes);
	if (current.getTime() < dayStart.getTime()) current = new Date(dayStart);
	if (current.getTime() > dayEnd.getTime()) current = atTime(new Date(current.getTime() + 24 * 3600 * 1000), s.hours, s.minutes);

	out.push(new Date(current));

	for (let i = 1; i < count; i++) {
		const inc = Math.floor(Math.random() * (maxIncrementSeconds - minIncrementSeconds + 1)) + minIncrementSeconds;
		const candidate = new Date(current.getTime() + inc * 1000);
		const candidateDayEnd = atTime(candidate, e.hours, e.minutes);
		if (candidate.getTime() <= candidateDayEnd.getTime()) {
			current = candidate;
			out.push(new Date(current));
			continue;
		}
		// overflow day -> move to next day at start + small offset
		const nextStart = atTime(new Date(current.getTime() + 24 * 3600 * 1000), s.hours, s.minutes);
		const offset = Math.floor(Math.random() * (maxIncrementSeconds + 1));
		current = new Date(nextStart.getTime() + offset * 1000);
		out.push(new Date(current));
	}
	return out;
}

/**
 * Return array of { invoiceNumber, createdAt } entries for mass printing.
 * The first entry corresponds to baseInvoice & baseDate.
 */
export function generateMassPrintEntries(baseInvoice: string, baseDate: Date, count: number, opts: TimestampOpts = {}) {
	const invoices = generateInvoiceNumbers(baseInvoice, count);
	const times = generateTimestampSequence(baseDate, count, opts);
	const out = invoices.map((inv, idx) => ({ invoiceNumber: inv, createdAt: times[idx] }));
	return out;
}

export default {
	parseNumericSuffix,
	generateInvoiceNumbers,
	generateTimestampSequence,
	generateMassPrintEntries,
};
