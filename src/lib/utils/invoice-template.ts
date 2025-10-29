import formatIDR from "./currency";
import { TotalsResult } from "./calculator";
import { escapeHtml, formatAddressForHtml, formatPhoneForHtml } from "./format-address-phone";

export interface InvoiceItem {
  label: string;
  qty: number;
  price: number;
}

export interface InvoiceMeta {
  storeName?: string;
  address?: string;
  cashier?: string;
  invoiceNumber?: string;
  createdAt?: Date;
  outletName?: string;
  outletCode?: string;
  phone?: string;
  wa?: string;
  footerNote?: string;
  paymentMethod?: string;
  paymentAmount?: number | string;
}

export function renderInvoiceTemplate(items: InvoiceItem[], totals: TotalsResult, meta: InvoiceMeta = {}) {
  const { storeName = "RAJA SUSU", address = "", cashier = "Cashier", invoiceNumber = "", createdAt = new Date(), outletName = "", outletCode = "", phone = "", wa = "", footerNote = "", paymentMethod = "", paymentAmount = undefined } = meta;

  // allow headerHtml/raw (already escaped by caller) for richer header blocks
  const headerHtmlRaw = (meta as any).headerHtml as string | undefined;
  const footerHtmlRaw = (meta as any).footerHtml as string | undefined;
  const nameMemberRaw = (meta as any).nameMember;
  const phoneMemberRaw = (meta as any).phoneMember;
  const startPointRaw = (meta as any).startPoint;
  const nameMemberHtml = nameMemberRaw ? escapeHtml(String(nameMemberRaw)) : "";
  const phoneMemberHtml = phoneMemberRaw ? escapeHtml(String(phoneMemberRaw)) : "";
  const _spn = Number(startPointRaw);
  const startPointNum = Number.isFinite(_spn) && _spn > 0 ? Math.floor(_spn) : 0;

  const rowsHtml = items
    .map((it: any) => {
      const adj = it.adjustment ?? null;
      const discountPerUnit = adj && typeof adj.discountPerUnit === "number" ? adj.discountPerUnit : 0;
      const discountHtml = discountPerUnit > 0 ? `<i class="fw-bold text-danger small">-${formatIDR(discountPerUnit)}</i>` : "";
      const promoTextHtml = adj && adj.promoText ? `<small class="fst-italic text-success" style="overflow-wrap: break-word;">${escapeHtml(String(adj.promoText))}</small>` : "";
      return `
      <div class="border-y pt-1">
        <div class="row g-0">
          <div class="col-11">
            <div> ${escapeHtml(String(it.label))} </div>
            ${promoTextHtml}
          </div>
        </div>
        <div class="d-flex g-0 pb-1">
          <div class="flex-grow-1 text-end">
            <div class="d-flex align-items-baseline justify-content-end me-5">
              <span class="small"> ${String(it.qty)} </span>
              <span class="small mx-1">x</span>
              <span class="small d-inline-flex align-items-baseline">${formatIDR(it.originalPrice ?? it.price)}${discountHtml}</span>
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
  // full timestamp (with seconds) for the footer/note area
  const createdFullStr = `${String(created.getDate()).padStart(2, "0")} ${created.toLocaleString(undefined, {
    month: "short",
  })} ${created.getFullYear()} ${String(created.getHours()).padStart(2, "0")}:${String(created.getMinutes()).padStart(2, "0")}:${String(created.getSeconds()).padStart(2, "0")}`;
  // shorter timestamp (no seconds) for the header
  const createdShortStr = `${String(created.getDate()).padStart(2, "0")} ${created.toLocaleString(undefined, {
    month: "short",
  })} ${created.getFullYear()} ${String(created.getHours()).padStart(2, "0")}:${String(created.getMinutes()).padStart(2, "0")}`;

  // build SO number in requested format: SO-OUTABBR.YY.MM.INVOICENUM
  // example: SO-PJRN.25.10.1900
  const yy = String(created.getFullYear() % 100).padStart(2, "0");
  const mm = String(created.getMonth() + 1).padStart(2, "0");
  const dd = String(created.getDate()).padStart(2, "0");

  // abbreviate outletCode: remove vowels, non-letters, uppercase, take first 4 chars
  function abbrev(code: string) {
    return String(code)
      .toUpperCase()
      .replace(/[^A-Z]/g, "")
      .replace(/[AEIOU]/g, "")
      .slice(0, 4);
  }

  // get numeric part of invoiceNumber and pad to at least 5 digits
  const invoiceDigitsRaw = (String(invoiceNumber).match(/\d+/) || [String(invoiceNumber).replace(/\D/g, "") || "0"])[0];
  const invoiceDigits = String(invoiceDigitsRaw).padStart(5, "0");

  const soNumber = outletCode ? `SO-${abbrev(String(outletCode))}.${yy}.${mm}.${invoiceDigits}` : `SO-${String(invoiceNumber)}`;

  const addressHtml = formatAddressForHtml(address);
  const phoneHtml = formatPhoneForHtml(phone, wa);

  // pluralize "Item(s)" based on total quantity (Qty) — if Qty === 1 show 'Item', otherwise 'Items'
  const itemsLabel = totals && typeof totals.totalQuantity === "number" && totals.totalQuantity === 1 ? "Item" : "Items";

  // payment handling: allow invoice to show method and amount (falls back to totals.totalRupiah)
  const paymentMethodLabel = paymentMethod || "";
  // try to parse paymentAmount if provided, otherwise use totals.totalRupiah
  function parsePaymentAmount(v: any) {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      // strip non-numeric (like thousands separators) and parse
      const cleaned = v.replace(/[^0-9.-]+/g, "");
      const n = Number(cleaned);
      if (Number.isFinite(n)) return n;
    }
    return undefined;
  }
  const paymentAmountParsed = parsePaymentAmount((meta as any).paymentAmount);

  const script = `(function(){
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

  // compute surcharge/formatting for display: if percent provided, compute from totals
  const _surchargeRaw = Number((meta as any).paymentSurcharge) || 0;
  const _surchargePct = (meta as any).paymentSurchargePercent;
  let _surchargeFloat = 0;
  if (typeof _surchargePct === "number") {
    _surchargeFloat = (totals.totalRupiah * _surchargePct) / 100;
  } else {
    _surchargeFloat = _surchargeRaw;
  }
  // round to 2 decimals for display, but keep integer if no fractional part
  const _surchargeRounded2 = Math.round(_surchargeFloat * 100) / 100;
  function formatMaybeDecimals(n: number) {
    const rounded2 = Math.round(n * 100) / 100;
    if (Number.isInteger(rounded2)) {
      return formatIDR(Math.round(rounded2));
    }
    // use en-US style (comma thousands, dot decimals) to match existing examples
    return rounded2.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  const _totalWithSurcharge = totals.totalRupiah + _surchargeRounded2;

  // compute loyalty points: 1 point per 200,000 IDR. startPoint can be provided via meta.startPoint
  const START_POINT = startPointNum || 0;
  const pointsFromAmount = Math.floor((totals && typeof totals.totalRupiah === "number" ? totals.totalRupiah : 0) / 200000);
  const loyaltyTotal = START_POINT + pointsFromAmount;
  // only render loyalty block when at least one of the member inputs is provided
  const hasMemberInfo = (nameMemberRaw && String(nameMemberRaw).trim().length > 0) || (phoneMemberRaw && String(phoneMemberRaw).trim().length > 0) || (startPointNum && startPointNum > 0);
  const loyaltyHtml = hasMemberInfo ? `<div class="row g-0 mt-2"><div class="col-md-12 text-center"><strong class="mt-3 mb-1 d-block"> Loyalty Point </strong><span class="pb-3"><p>${START_POINT} + ${pointsFromAmount} = ${loyaltyTotal}</p></span></div></div>` : "";

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Invoice Preview</title>
    <link href="https://cdn.jsdelivr.net/npm/dealpos-font@1.9.18/font-awesome/css/all.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/dealpos@25.36.4/browser/styles-H2UJWE23.css">
    <link rel="stylesheet" href="/template.css">
    <style>
      body{ font-family: Arial, sans-serif; background: transparent; }
      .invoice_mini{ width:100%; }
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
            <div class="mb-2">${escapeHtml(outletName ? `${outletName}` : "")}</div>
            <p class="mt-1 mb-3"><span>${addressHtml}</span></p>
            <div class="mb-1">${phoneHtml}</div>
          `
            }
          </div>
        ${headerHtmlRaw ? '<div style="height:6px;line-height:6px">&nbsp;</div>' : ""}
        ${nameMemberHtml || phoneMemberHtml ? `<div class="row g-0"><div class="col-12 text-center">${nameMemberHtml ? `<h6 class="m-0 pt-2 fw-bold">${nameMemberHtml}</h6>` : ""}${phoneMemberHtml ? `<div>${phoneMemberHtml}</div>` : ""}</div></div>` : ""}
        <div class="row g-0">Cashier : ${escapeHtml(cashier)}</div>
        <div class="row g-0 justify-content-between py-2">
          <div class="col fw-bold">
            <div>Invoice</div>
            <div>${soNumber}</div>
          </div>
          <div class="col text-end">
            <div>${escapeHtml(createdShortStr)}</div>
          </div>
        </div>

        ${rowsHtml}

        <div class="cartAmount pt-2">
          <div class="row g-0 text-end">
            <div class="col-7 fw-bold"> Total (${itemsLabel}: ${totals.totalItems}, Qty: ${totals.totalQuantity}) : </div>
            <div class="col-5 g-0">
              <div class="row">
                <div class="col-auto">
                  <span>Rp </span>
                </div>
                <div class="col">
                  <span>${formatIDR(totals.totalRupiah)}</span>
                </div>
              </div>
            </div>
          </div>
          ${
            _surchargeRounded2 > 0
              ? `
  <div class="row g-0 text-end">
    <div class="col-7 fw-bold border-top">
      <span>Biaya Layanan${typeof _surchargePct === "number" ? ` (${_surchargePct}%)` : ""} :</span>
    </div>
    <div class="col-5 g-0 border-top">
      <div class="row">
        <div class="col-auto"><span>Rp </span></div>
        <div class="col"><span>${formatMaybeDecimals(_surchargeRounded2)}</span></div>
      </div>
    </div>
  </div>
  <div class="row g-0 text-end pb-2">
    <div class="col-7 fw-bold">
      <span>Total Amount :</span>
    </div>
    <div class="col-5 g-0">
      <div class="row">
        <div class="col-auto"><span>Rp </span></div>
        <div class="col"><span>${formatIDR(Math.round(_totalWithSurcharge))}</span></div>
      </div>
    </div>
  </div>
`
              : ""
          }
        </div>
        ${
          paymentMethodLabel
            ? (() => {
                const payAmount = typeof paymentAmountParsed === "number" ? paymentAmountParsed : totals.totalRupiah;
                const change = paymentMethodLabel.toLowerCase() === "cash" ? payAmount - totals.totalRupiah : 0;
                const rows: string[] = [];
                // use same inner layout as cart total to ensure the 'Rp' and amounts align vertically
                // For Cash, don't include a trailing colon (visual preference). For other methods, keep the colon
                const methodLabelHtml = String(paymentMethodLabel).toLowerCase() === "cash" ? `${escapeHtml(paymentMethodLabel)}` : `${escapeHtml(paymentMethodLabel)} :`;
                rows.push(`<div class="row g-0 text-end"><div class="col-7 fw-bold pe-3">${methodLabelHtml}</div><div class="col-5 g-0"><div class="row"><div class="col-auto"><span>Rp </span></div><div class="col"><span>${formatIDR(payAmount)}</span></div></div></div></div>`);
                if (change > 0)
                  rows.push(
                    `<div class="row g-0 text-end">
  <div class="col-7 fw-bold">Change :</div>
  <div class="col-5 row g-0">
    <span class="col-auto">Rp</span>
    <span class="col">${formatIDR(change)}</span>
  </div>
</div>`,
                  );
                // marketing/footer handled later to avoid duplication; do not insert it here
                return `<div>${rows.join("\n")}</div>`;
              })()
            : `
              `
        }
        ${paymentMethodLabel ? `<div style="height:8px; line-height:8px">&nbsp;</div>` : ""}
        ${loyaltyHtml}
        ${
          // if footerHtmlRaw provided, render it instead of the plain footerNote to avoid duplication
          footerHtmlRaw ? footerHtmlRaw : footerNote ? `<div class="text-center mt-2"><small>${escapeHtml(footerNote)}</small></div>` : ""
        }
        <!-- spacer between footer and created timestamp -->
        <div style="height:8px; line-height:8px">&nbsp;</div>
  <div class="text-center mt-3"><p class="m-0"> Created : ${escapeHtml(createdFullStr)} </p></div>
      </div>
    </pos-invoice-mini>
    <script>${script}</script>
  </body>
</html>`;
}

export default renderInvoiceTemplate;
