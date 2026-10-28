// Shipping label (4x6in) and A4 invoice printing. Opens a self-contained
// print window so it works on both Lovable hosting and the static cPanel build.

export type PrintItem = { product_name: string; size: string; quantity: number; unit_price: number };
export type PrintOrder = {
  order_number: string;
  created_at: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  address_line: string;
  city: string;
  postal_code: string;
  country: string;
  payment_method: string;
  payment_status: string;
  subtotal: number;
  discount: number;
  shipping_fee: number;
  total: number;
  courier?: string;
  tracking_number?: string;
  order_items?: PrintItem[];
};

const SENDER_KEY = "comforthub-dispatch-address";
export const DEFAULT_SENDER = "Comfort Hub\nAdd your dispatch address in Admin → Delivery\nPhone: 8590233909";
export const getSender = () =>
  (typeof window !== "undefined" && localStorage.getItem(SENDER_KEY)) || DEFAULT_SENDER;
export const setSender = (v: string) => localStorage.setItem(SENDER_KEY, v);

// ---- Code 128 (set B) barcode as SVG ----
const C128 = [
  "212222","222122","222221","121223","121322","131222","122213","122312","132212","221213","221312","231212","112232","122132","122231","113222","123122","123221","223211","221132","221231","213212","223112","312131","311222","321122","321221","312212","322112","322211","212123","212321","232121","111323","131123","131321","112313","132113","132311","211313","231113","231311","112133","112331","132131","113123","113321","133121","313121","211331","231131","213113","213311","213131","311123","311321","331121","312113","312311","332111","314111","221411","431111","111224","111422","121124","121421","141122","141221","112214","112412","122114","122411","142112","142211","241211","221114","413111","241112","134111","111242","121142","121241","114212","124112","124211","411212","421112","421211","212141","214121","412121","111143","111341","131141","114113","114311","411113","411311","113141","114131","311141","411131","211412","211214","211232","2331112",
];
export function barcodeSvg(text: string, height = 60): string {
  const clean = text.replace(/[^\x20-\x7e]/g, "");
  const codes = [104, ...[...clean].map((c) => c.charCodeAt(0) - 32)];
  const check = codes.reduce((s, c, i) => s + c * (i === 0 ? 1 : i), 0) % 103;
  const pattern = [...codes, check, 106].map((c) => C128[c]).join("");
  let x = 10, rects = "";
  [...pattern].forEach((w, i) => {
    const n = Number(w);
    if (i % 2 === 0) rects += `<rect x="${x}" y="0" width="${n}" height="${height}"/>`;
    x += n;
  });
  const width = x + 10;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" style="width:100%;height:${height}px" fill="#000">${rects}</svg>`;
}

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const inr = (n: number) => "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const isCod = (o: PrintOrder) => o.payment_method === "cod" && o.payment_status !== "paid";

function labelHtml(o: PrintOrder) {
  const items = (o.order_items ?? []).map((i) => `${esc(i.product_name)}${i.size ? ` (${esc(i.size)})` : ""} × ${i.quantity}`).join("<br>");
  return `<section class="label">
  <div class="row head"><b>COMFORT HUB</b><span>${esc(new Date(o.created_at).toLocaleDateString("en-IN"))}</span></div>
  <div class="pay ${isCod(o) ? "cod" : ""}">${isCod(o) ? `COD — COLLECT ${inr(o.total)}` : "PREPAID — DO NOT COLLECT"}</div>
  <div class="box"><small>SHIP TO</small>
    <div class="name">${esc(o.customer_name)}</div>
    <div>${esc(o.address_line)}</div>
    <div>${esc(o.city)}${o.country ? `, ${esc(o.country)}` : ""}</div>
    <div class="pin">PIN ${esc(o.postal_code)}</div>
    <div>Ph: ${esc(o.customer_phone)}</div>
  </div>
  <div class="bc">${barcodeSvg(o.order_number, 54)}<div>${esc(o.order_number)}</div></div>
  ${o.tracking_number ? `<div class="bc">${barcodeSvg(o.tracking_number, 40)}<div>${esc(o.courier || "AWB")}: ${esc(o.tracking_number)}</div></div>` : ""}
  <div class="box small"><small>CONTENTS</small><div>${items || "—"}</div></div>
  <div class="box small"><small>RETURN TO</small><div>${esc(getSender()).replace(/\n/g, "<br>")}</div></div>
</section>`;
}

function invoiceHtml(o: PrintOrder) {
  const rows = (o.order_items ?? []).map((i) => `<tr><td>${esc(i.product_name)}</td><td>${esc(i.size || "—")}</td><td class="r">${i.quantity}</td><td class="r">${inr(i.unit_price)}</td><td class="r">${inr(i.unit_price * i.quantity)}</td></tr>`).join("");
  return `<section class="invoice">
  <div class="ih"><div><h1>COMFORT HUB</h1><p>Your comfort. Our priority.</p><p class="muted">${esc(getSender()).replace(/\n/g, "<br>")}</p></div>
  <div class="r"><h2>INVOICE / PACKING SLIP</h2><p>No: <b>${esc(o.order_number)}</b></p><p>Date: ${esc(new Date(o.created_at).toLocaleDateString("en-IN"))}</p></div></div>
  <div class="cols"><div><small>BILL / SHIP TO</small><p><b>${esc(o.customer_name)}</b><br>${esc(o.address_line)}<br>${esc(o.city)} ${esc(o.postal_code)}<br>${esc(o.country)}<br>${esc(o.customer_phone)}<br>${esc(o.customer_email)}</p></div>
  <div><small>PAYMENT</small><p>${o.payment_method === "cod" ? "Cash on delivery" : "UPI"} — ${esc(o.payment_status)}</p>${o.tracking_number ? `<small>SHIPPING</small><p>${esc(o.courier)} · ${esc(o.tracking_number)}</p>` : ""}</div></div>
  <table><thead><tr><th>Item</th><th>Size</th><th class="r">Qty</th><th class="r">Price</th><th class="r">Amount</th></tr></thead><tbody>${rows}</tbody></table>
  <table class="tot"><tr><td>Subtotal</td><td class="r">${inr(o.subtotal)}</td></tr>
  ${Number(o.discount) ? `<tr><td>Discount</td><td class="r">−${inr(o.discount)}</td></tr>` : ""}
  <tr><td>Shipping</td><td class="r">${Number(o.shipping_fee) ? inr(o.shipping_fee) : "Free"}</td></tr>
  <tr class="g"><td>Total</td><td class="r">${inr(o.total)}</td></tr>
  ${isCod(o) ? `<tr><td>Amount due on delivery</td><td class="r">${inr(o.total)}</td></tr>` : ""}</table>
  <p class="foot">Thank you for shopping with Comfort Hub. For returns or exchanges, contact us within 7 days of delivery with your order number.</p>
</section>`;
}

const CSS = {
  label: `@page{size:4in 6in;margin:0}body{margin:0;font-family:Arial,sans-serif;color:#000}
.label{width:4in;height:6in;box-sizing:border-box;padding:.12in;display:flex;flex-direction:column;gap:6px;page-break-after:always;overflow:hidden}
.row{display:flex;justify-content:space-between}.head{border-bottom:2px solid #000;padding-bottom:4px;font-size:14px}
.pay{border:2px solid #000;text-align:center;font-weight:700;padding:4px;font-size:13px}.pay.cod{background:#000;color:#fff;font-size:15px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.box{border:1px solid #000;padding:5px;font-size:12px;line-height:1.3}.box small{font-size:9px;font-weight:700;letter-spacing:1px}
.name{font-size:16px;font-weight:700}.pin{font-size:18px;font-weight:700}.small{font-size:10px}
.bc{text-align:center;font-family:monospace;font-size:12px;font-weight:700}`,
  invoice: `@page{size:A4;margin:14mm}body{margin:0;font-family:Arial,sans-serif;color:#111;font-size:12px}
.invoice{page-break-after:always}.ih{display:flex;justify-content:space-between;border-bottom:2px solid #111;padding-bottom:10px}
h1{margin:0;font-size:24px;letter-spacing:2px}h2{margin:0;font-size:14px}p{margin:3px 0}.muted{color:#555}.r{text-align:right}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:16px 0}small{font-size:9px;font-weight:700;letter-spacing:1px;color:#555}
table{width:100%;border-collapse:collapse}th{text-align:left;border-bottom:1px solid #111;padding:6px 4px;font-size:11px}td{padding:6px 4px;border-bottom:1px solid #ddd}
.tot{width:45%;margin:12px 0 0 auto}.tot .g td{font-weight:700;font-size:14px;border-top:2px solid #111}.foot{margin-top:30px;color:#555;font-size:11px}`,
};

export function printDocs(kind: "label" | "invoice", orders: PrintOrder[]) {
  if (!orders.length) return;
  const w = window.open("", "_blank", "width=820,height=900");
  if (!w) { alert("Please allow pop-ups to print."); return; }
  const body = orders.map(kind === "label" ? labelHtml : invoiceHtml).join("");
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${kind === "label" ? "Shipping labels" : "Invoices"}</title><style>${CSS[kind]}</style></head><body>${body}<script>window.onload=()=>setTimeout(()=>window.print(),200)<\/script></body></html>`);
  w.document.close();
}
