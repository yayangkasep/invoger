import { NextResponse } from "next/server";
import admin from "@/lib/auth/admin";
import { generateReceiptHtml } from "@/lib/utils/prints-template";
import fs from "fs/promises";
import path from "path";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const outletId = body?.outletId;
    const items = body?.items;
    if (!outletId)
      return NextResponse.json({ error: "missing_outletId" }, { status: 400 });

    const db = admin.firestore();
    const snap = await db
      .collection("printsTemplates")
      .where("outletId", "==", outletId)
      .limit(1)
      .get();
    const template = snap.empty
      ? null
      : { id: snap.docs[0].id, ...snap.docs[0].data() };

    const outletDoc = await db.collection("outlets").doc(outletId).get();
    const outletData = outletDoc.exists
      ? { id: outletDoc.id, ...outletDoc.data() }
      : null;

    const itemsToUse =
      Array.isArray(items) && items.length
        ? items
        : [{ label: "Sample Item", qty: 1, price: 0 }];
    let html = await generateReceiptHtml(template, outletData, itemsToUse);

    // attempt to inline /template.css from the public folder so the returned HTML is self-contained
    try {
      const publicPath = path.join(process.cwd(), "public", "template.css");
      const css = await fs.readFile(publicPath, "utf8");
      // replace external link to /template.css with an inline style block if present
      if (html && typeof html === "string") {
        html = html.replace(
          /<link[^>]+href=["']\/template\.css["'][^>]*>/i,
          `<style>${css}</style>`,
        );
        // as a fallback, if no link tag present, inject into </head> if available
        if (!/<style>/.test(html) && html.includes("</head>")) {
          html = html.replace("</head>", `<style>${css}</style></head>`);
        }
      }
    } catch (e) {
      // ignore file read errors; return original HTML
    }

    return new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: String(err?.message || err) },
      { status: 500 },
    );
  }
}
