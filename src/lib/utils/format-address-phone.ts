// Helpers for formatting address and phone blocks into safe HTML with <br> lines.
// Intentionally lightweight and dependency-free so templates and editors can reuse it.

export function escapeHtml(s: string) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Normalize a text block into safe HTML lines separated by <br>.
// Splits on commas and newlines and trims each part.
export type FormatLinesOptions = {
  // whether to split on newline characters (\n). Default: true
  splitOnNewline?: boolean;
  // whether to split on commas. Default: true
  splitOnComma?: boolean;
  // collapse multiple empty lines into one (not applied to parts, but controls filtering)
  collapseEmpty?: boolean;
  // optional max characters per line; when provided long parts will be wrapped at word boundaries
  maxLineLength?: number;
};

function wrapLongLine(line: string, maxLen: number) {
  if (!maxLen || line.length <= maxLen) return [line];
  const words = line.split(/\s+/);
  const out: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length <= maxLen) {
      cur = (cur + ' ' + w).trim();
    } else {
      if (cur) out.push(cur);
      cur = w;
    }
  }
  if (cur) out.push(cur);
  return out;
}

export function formatTextLinesToHtml(raw?: string, opts?: FormatLinesOptions) {
  if (!raw) return '';
  const o: FormatLinesOptions = {
    splitOnNewline: true,
    splitOnComma: true,
    collapseEmpty: true,
    ...opts,
  };

  // build split regex according to options
  const partsRaw = String(raw);
  let splitRegex: RegExp;
  if (o.splitOnNewline && o.splitOnComma) splitRegex = /[\n,]+/;
  else if (o.splitOnNewline) splitRegex = /[\n]+/;
  else if (o.splitOnComma) splitRegex = /[,]+/;
  else splitRegex = /(?:\r?\n)/; // fallback: split on newline

  const rawParts = partsRaw.split(splitRegex).map((p) => String(p).trim());
  const parts: string[] = [];
  for (const p of rawParts) {
    if (!p) {
      if (!o.collapseEmpty) parts.push('');
      continue;
    }
    if (o.maxLineLength && o.maxLineLength > 0) {
      const wrapped = wrapLongLine(p, o.maxLineLength);
      for (const w of wrapped) parts.push(w);
    } else {
      parts.push(p);
    }
  }

  if (parts.length === 0) return '';
  return parts.map((p) => escapeHtml(p)).join('<br>');
}

// Accept either a string address or an object with common fields and produce HTML
// with <br> separators. Mirrors behavior used elsewhere (invoice rendering).
export function formatAddressForHtml(a: any) {
  if (!a) return '';
  if (typeof a === 'string') return formatTextLinesToHtml(a);
  if (typeof a === 'object') {
    const parts: string[] = [];
    if (a.street) parts.push(String(a.street));
    if (a.rt || a.rw) parts.push(`RT ${a.rt ?? ''}${a.rw ? '/' + a.rw : ''}`.trim());
    if (a.kelurahan || a.village) parts.push(a.kelurahan ?? a.village);
    if (a.kecamatan || a.district) parts.push(a.kecamatan ?? a.district);
    if (a.city || a.kabupaten) parts.push(a.city ?? a.kabupaten);
    if (a.postalCode || a.kodepos) parts.push(a.postalCode ?? a.kodepos);
    const clean = parts.map((p) => String(p).trim()).filter(Boolean);
    return clean.length ? clean.map((p) => escapeHtml(p)).join('<br>') : '';
  }
  return escapeHtml(String(a));
}

// Format phone + WA lines. Returns '' when no data.
export function formatPhoneForHtml(phone?: string | null, wa?: string | null) {
  const lines: string[] = [];
  if (phone) lines.push(`Tlp ${escapeHtml(String(phone))}`);
  if (wa) lines.push(`WA ${escapeHtml(String(wa))}`);
  return lines.join('<br>');
}

export default {
  escapeHtml,
  formatTextLinesToHtml,
  formatAddressForHtml,
  formatPhoneForHtml,
};
