import formatIDR from "./currency";
import computeTotals, { TotalsResult } from "./calculator";
import {
  escapeHtml,
  formatAddressForHtml,
  formatPhoneForHtml,
} from "./format-address-phone";

export interface PrintItem {
  label: string;
  qty: number;
  price: number;
}

export interface PrintMeta {
  title?: string;
  headerText?: string;
  footerText?: string;
  outletName?: string;
  address?: string;
  phone?: string;
  cashier?: string;
  createdAt?: Date;
}

// (escapeHtml is imported from format-address-phone)

const heightScript = `(function(){
	function sendHeight(){
		try{
			var h = document.documentElement.scrollHeight || document.body.scrollHeight;
			parent.postMessage({ type: 'invoice-height', height: h }, '*');
		}catch(e){}
	}
	window.addEventListener('load', sendHeight);
	setTimeout(sendHeight,150);
	var mo = new MutationObserver(sendHeight);
	mo.observe(document.documentElement || document.body, { childList:true, subtree:true, attributes:true, characterData:true });
})();`;

// Helper: resolve nested path from object, e.g. getPath(outlet, 'name') or 'raw.address'
function getPath(obj: any, path: string) {
  if (!obj) return undefined;
  const parts = String(path).split(".");
  let cur: any = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

// Replace template variables like {{outlet.name}} using the provided outlet object.
export function replaceVariables(text: string, outlet: any) {
  if (!text) return "";
  return text.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_, key) => {
    // currently only support outlet.* variables; if other keys provided, fall back to empty
    const k = String(key).trim();
    if (k.startsWith("outlet.")) {
      const path = k.slice("outlet.".length);
      const val = getPath(outlet, path);
      return escapeHtml(String(val ?? ""));
    }
    // fallback: try top-level key on outlet
    const val = getPath(outlet, k);
    return escapeHtml(String(val ?? ""));
  });
}

function blockToHtml(block: any, outlet: any) {
  const textRaw = block && typeof block.text === "string" ? block.text : "";
  // replace variables and escape outlet values
  const replaced = replaceVariables(textRaw, outlet);
  // preserve newlines by converting to <br /> — but keep it as HTML (caller expects headerHtml to be raw HTML)
  const withBreaks = replaced.replace(/\r?\n/g, "<br/>");
  const align = block && block.align ? String(block.align) : "center";
  const bold = block && block.bold ? "font-weight:700;" : "";
  const italic = block && block.italic ? "font-style:italic;" : "";
  const style = `text-align:${align}; ${bold} ${italic} margin:0; white-space:pre-wrap;`;
  return `<div style="${style}">${withBreaks}</div>`;
}

export function blocksToHtml(
  blocks: any[] | undefined,
  outlet: any,
  opts?: { skipStoreBlock?: boolean },
) {
  if (!blocks || !Array.isArray(blocks)) return "";
  const arr = Array.from(blocks || []);
  // Optionally skip the first block if it's the store header (id h-store) to avoid duplicate store name
  if (
    opts?.skipStoreBlock &&
    arr.length > 0 &&
    String(arr[0].id || "")
      .toLowerCase()
      .includes("h-store")
  ) {
    arr.shift();
  }
  // detect phone block presence to insert spacer after address block
  const hasPhone = arr.some(
    (b) => String(b.id || "").toLowerCase() === "h-phone",
  );
  const parts: string[] = [];
  for (let i = 0; i < arr.length; i++) {
    const b = arr[i];
    parts.push(blockToHtml(b, outlet));
    // if this is an address block and phone exists, insert small spacer
    if (hasPhone && String(b.id || "").toLowerCase() === "h-addr") {
      parts.push('<div style="height:8px; line-height:8px">&nbsp;</div>');
    }
  }
  return parts.join("\n");
}

/**
 * Generate final receipt HTML using a printsTemplate document and outlet data.
 * - Only header and footer blocks are applied from template (middle section kept as default)
 * - Template block properties (align, bold, italic, text) are applied as inline styles
 * - Variables like {{outlet.name}} are resolved from outletData and escaped
 * - Newlines in text are preserved as <br/>
 */
export async function generateReceiptHtml(
  printTemplate: any | null,
  outletData: any | null,
  items: any[],
) {
  // if outletData isn't provided but the template references an outletId, try to fetch outlet from API
  let outlet = outletData;
  if (!outlet && printTemplate && printTemplate.outletId) {
    try {
      const res = await fetch(
        `/api/outlets/${encodeURIComponent(String(printTemplate.outletId))}`,
        { credentials: "same-origin" },
      );
      const body = await res.json().catch(() => null);
      if (res.ok && body && body.ok && body.outlet) outlet = body.outlet;
    } catch (e) {
      // ignore fetch errors and continue with null outlet
    }
  }

  const totals = computeTotals(
    (items || []).map((i: any) => ({ ...i, price: i.price ?? 0 })),
    { format: false },
  );

  const headerHtml =
    printTemplate &&
    printTemplate.headerBlocks &&
    printTemplate.headerBlocks.length > 0
      ? blocksToHtml(printTemplate.headerBlocks, outlet, {
          skipStoreBlock: true,
        })
      : undefined;

  // footerTemplate takes precedence if provided (string with possible variables/newlines)
  let footerHtml: string | undefined = undefined;
  if (printTemplate) {
    if (
      printTemplate.footerTemplate &&
      typeof printTemplate.footerTemplate === "string" &&
      printTemplate.footerTemplate.trim().length > 0
    ) {
      const replaced = replaceVariables(printTemplate.footerTemplate, outlet);
      footerHtml = `<div style="text-align:center; white-space:pre-wrap;">${replaced.replace(/\r?\n/g, "<br/>")}</div>`;
    } else if (
      printTemplate.footerBlocks &&
      Array.isArray(printTemplate.footerBlocks) &&
      printTemplate.footerBlocks.length > 0
    ) {
      footerHtml = blocksToHtml(printTemplate.footerBlocks, outlet);
    }
  }

  const meta: any = {
    storeName:
      printTemplate?.outletLabel ??
      outlet?.storeName ??
      outlet?.Name ??
      outlet?.name ??
      "RAJA SUSU",
    outletName: outlet?.name ?? outlet?.Name ?? outlet?.label ?? "",
    address: outlet?.address ?? outlet?.raw?.address ?? outlet?.Address ?? "",
    phone: outlet?.phone ?? outlet?.Phone ?? "",
    cashier: outlet?.cashier ?? "POS",
    headerHtml: headerHtml || undefined,
    footerHtml: footerHtml || undefined,
    footerText: undefined,
    createdAt: new Date(),
    outletCode: outlet?.code ?? outlet?.Code ?? undefined,
    invoiceNumber: outlet?.invoiceNumber ?? outlet?.InvoiceNumber ?? undefined,
  };

  // reuse existing renderer
  return renderPrintTemplate(items || [], totals, meta as any);
}

export default function renderPrintTemplate(
  items: PrintItem[],
  totals: TotalsResult,
  meta: PrintMeta = {},
) {
  const {
    title = "Preview",
    headerText = "",
    footerText = "",
    outletName = "",
    address = "",
    phone = "",
    cashier = "",
    createdAt = new Date(),
    storeName: metaStoreName,
  } = meta as any;
  // allow headerHtml raw (already escaped by caller) for richer header blocks
  const headerHtmlRaw = (meta as any).headerHtml as string | undefined;
  const storeName = metaStoreName ?? title;
  const rowsHtml = items
    .map((it) => {
      return `
			<div class="border-y pt-1">
				<div class="row g-0">
					<div class="col-11">
						<div> ${escapeHtml(String(it.label))} </div>
					</div>
				</div>
				<div class="d-flex g-0 pb-1">
					<div class="flex-grow-1 text-end">
						<div class="d-flex align-items-end justify-content-end me-5">
							<span class="small"> ${String(it.qty)} </span>
							<span class="small mx-1">x</span>
							<span class="small d-inline-flex flex-column"> ${formatIDR(it.price)} </span>
						</div>
					</div>
					<div class="col-auto text-end">
						<span> ${formatIDR(it.qty * it.price)} </span>
					</div>
				</div>
			</div>
		`;
    })
    .join("\n");

  const created = createdAt;
  const createdStr = `${String(created.getDate()).padStart(2, "0")} ${created.toLocaleString(undefined, { month: "short" })} ${created.getFullYear()} ${String(created.getHours()).padStart(2, "0")}:${String(created.getMinutes()).padStart(2, "0")}`;

  // prepare address/phone HTML fragments so we can control spacing precisely
  const addrHtml = formatAddressForHtml(address || "");
  const phoneHtml = formatPhoneForHtml(phone || "");

  // build a simple receipt/so number similar to invoice template
  const yy = String(created.getFullYear() % 100).padStart(2, "0");
  const mm = String(created.getMonth() + 1).padStart(2, "0");

  function abbrev(code: string) {
    return String(code)
      .toUpperCase()
      .replace(/[^A-Z]/g, "")
      .replace(/[AEIOU]/g, "")
      .slice(0, 4);
  }

  const rawInvoiceNumber = String((meta as any).invoiceNumber ?? "");
  const invoiceDigitsRaw = (rawInvoiceNumber.match(/\d+/) || [
    rawInvoiceNumber.replace(/\D/g, "") || "",
  ])[0];
  // if the numeric part is exactly 5 digits, use 00000 per requirement
  const invoiceDigits =
    String(invoiceDigitsRaw).length === 5
      ? "00000"
      : String(invoiceDigitsRaw).padStart(5, "0");
  const outletCode = String((meta as any).outletCode ?? "");
  const soNumber = outletCode
    ? `SO-${abbrev(String(outletCode))}.${yy}.${mm}.${invoiceDigits}`
    : rawInvoiceNumber
      ? `SO-${rawInvoiceNumber}`
      : "";

  return `<!doctype html>
	<html lang="en">
		<head>
			<meta charset="utf-8">
			<title>${escapeHtml(title)}</title>
			<link href="https://cdn.jsdelivr.net/npm/dealpos-font@1.9.18/font-awesome/css/all.min.css" rel="stylesheet">
			<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css">
			<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/dealpos@25.36.4/browser/styles-H2UJWE23.css">
			<link rel="stylesheet" href="/template.css">
			<style>
				body{ font-family: Arial, sans-serif; background: transparent; }
				.meta { font-size: 11px; color: #333 }
			</style>
		</head>
		<body>
			<pos-invoice-mini>
				<div class="box invoice_mini mt-5 print_container">
					<div class="text-center">
						<h2 class="m-0 fw-bold">${escapeHtml(storeName)}</h2>
						${
              headerHtmlRaw
                ? headerHtmlRaw
                : `
								<div class="mb-2">${escapeHtml(outletName || headerText || "")}</div>
								<div class="mt-1 mb-3 text-center">
                                    ${addrHtml ? `<div>${addrHtml}</div>` : ""}
                                    ${addrHtml && phoneHtml ? `<br/><br/>` : ""}
                                    ${phoneHtml ? `<div style="margin-top:4px">${phoneHtml}</div>` : ""}
								</div>
							`
            }
					</div>

					<div class="row g-0">Cashier : ${escapeHtml(cashier || "")}</div>
					<div class="row g-0 justify-content-between py-2">
						<div class="col fw-bold">
							<div>Invoice</div>
							${soNumber ? `<div>${escapeHtml(soNumber)}</div>` : ""}
						</div>
						<div class="col text-end">
							<div>${escapeHtml(createdStr)}</div>
						</div>
					</div>

					${rowsHtml}

					<div class="cartAmount pt-2">
						<div class="row g-0 text-end pb-2">
							<div class="col-7 fw-bold"> Total : </div>
							<div class="col-5 g-0">
								<div class="row">
									<div class="col-auto"><span>Rp </span></div>
									<div class="col"><span>${formatIDR(totals.totalRupiah)}</span></div>
								</div>
							</div>
						</div>
					</div>

					<!-- dummy payment section (matches template.html example) -->
					<div>
						<div class="row g-0 text-end">
							<div class="col-7 fw-bold pe-3"> Debit Mandiri </div>
							<div class="col-5 row g-0">
								<span class="col-auto">Rp</span>
								<span class="col"> ${formatIDR(totals.totalRupiah)}</span>
							</div>
						</div>
					</div>

					${(meta as any).footerHtml ? (meta as any).footerHtml : footerText ? `<div class="text-center mt-2"><small>${escapeHtml(footerText)}</small></div>` : ""}
				</div>
			</pos-invoice-mini>
			<script>${heightScript}</script>
		</body>
	</html>`;
}
