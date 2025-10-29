import { NextResponse } from "next/server";
import admin, { verifyIdToken } from "@/lib/auth/admin";
import { randomUUID } from "crypto";
import { AUTH_TOKEN_KEY } from "@/lib/auth/constants";
import { z } from "zod";

async function getTokenFromRequest(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth && auth.toLowerCase().startsWith("bearer "))
    return auth.split(" ")[1];
  const cookie = req.headers.get("cookie") || "";
  const m = cookie.match(new RegExp(`${AUTH_TOKEN_KEY}=([^;]+)`));
  if (m) return decodeURIComponent(m[1]);
  return null;
}

function parseCSVLine(line: string) {
  const values: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      // toggle quotes. if double-quote inside quoted value, consume second quote
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      values.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  values.push(cur);
  return values.map((v) => v.trim());
}

const RowSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  price: z
    .preprocess((v) => (v === "" ? undefined : v), z.number().optional())
    .default(0),
});

export async function POST(req: Request) {
  try {
    const token = await getTokenFromRequest(req);
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let user: any = null;
    try {
      user = await verifyIdToken(token);
    } catch (e) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Expect multipart/form-data with a file field named `file`
    const contentType = req.headers.get("content-type") || "";
    if (
      !contentType.includes("multipart/form-data") &&
      !contentType.includes("text/csv")
    ) {
      return NextResponse.json(
        {
          error: "invalid_content_type",
          message: "Expected multipart/form-data or text/csv",
        },
        { status: 400 },
      );
    }

    // If form-data, parse file; otherwise read body as text (CSV)
    let csvText = "";
    try {
      if (contentType.includes("multipart/form-data")) {
        const form = await req.formData();
        const file = form.get("file") as File | null;
        if (!file)
          return NextResponse.json(
            { error: "no_file", message: "file form field is required" },
            { status: 400 },
          );
        csvText = await file.text();
      } else {
        // treat body as raw CSV text
        csvText = await req.text();
      }
    } catch (e) {
      return NextResponse.json(
        { error: "invalid_formdata", message: "Unable to parse uploaded file" },
        { status: 400 },
      );
    }

    if (!csvText || !csvText.trim()) {
      return NextResponse.json(
        { error: "empty_file", message: "CSV file is empty" },
        { status: 400 },
      );
    }

    const lines = csvText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    if (lines.length === 0)
      return NextResponse.json(
        { error: "empty_file", message: "CSV file contains no data" },
        { status: 400 },
      );

    const headerFields = parseCSVLine(lines[0]);
    const expected = ["Name", "Code", "Price"];
    const headerLower = headerFields.map((h) => h.trim().toLowerCase());
    const expectedLower = expected.map((e) => e.toLowerCase());
    // require same length and same columns order/names (case-insensitive)
    if (
      headerFields.length < expected.length ||
      !expectedLower.every((v, i) => headerLower[i] === v)
    ) {
      return NextResponse.json(
        {
          error: "invalid_header",
          expected: expected.join(","),
          found: headerFields.join(","),
        },
        { status: 400 },
      );
    }

    const rowErrors: Array<{ row: number; errors: string[] }> = [];
    const parsedRows: Array<{
      name: string;
      code: string;
      price: number;
      promotion?: string | null;
    }> = [];

    for (let i = 1; i < lines.length; i++) {
      const raw = lines[i];
      const cols = parseCSVLine(raw);
      const rowIndex = i + 1;
      if (cols.length < expected.length) {
        rowErrors.push({ row: rowIndex, errors: ["missing columns"] });
        continue;
      }
      const name = cols[0];
      const code = cols[1];
      // allow price formatted with commas
      const priceRaw = cols[2].replace(/,/g, "");
      const priceNum = priceRaw === "" ? 0 : Number(priceRaw);
      const errors: string[] = [];
      if (!name || name.trim() === "") errors.push("name_required");
      if (!code || code.trim() === "") errors.push("code_required");
      if (Number.isNaN(priceNum)) errors.push("price_invalid");
      if (errors.length > 0) {
        rowErrors.push({ row: rowIndex, errors });
        continue;
      }
      const parsed = RowSchema.parse({
        name: name.trim(),
        code: code.trim(),
        price: priceNum,
      });
      parsedRows.push({
        name: parsed.name,
        code: parsed.code,
        price: parsed.price,
      });
    }

    if (rowErrors.length > 0) {
      return NextResponse.json(
        { error: "validation_failed", issues: rowErrors },
        { status: 400 },
      );
    }

    // deduplicate: fetch existing products by code in chunks
    const db = admin.firestore();
    const created: Array<{
      id: string;
      data: any;
      skipped?: boolean;
      existingId?: string;
    }> = [];

    // helper to get existing map by code
    async function fetchExistingByCodes(codes: string[]) {
      const map: Record<string, any[]> = {};
      if (codes.length === 0) return map;
      // Firestore 'in' supports up to 10 values
      const chunks: string[][] = [];
      for (let i = 0; i < codes.length; i += 10)
        chunks.push(codes.slice(i, i + 10));
      for (const chunk of chunks) {
        const snap = await db
          .collection("products")
          .where("code", "in", chunk)
          .get();
        snap.docs.forEach((d) => {
          const c = d.get("code") || d.get("Code") || null;
          if (!c) return;
          const key = String(c);
          map[key] = map[key] || [];
          map[key].push({ id: d.id, data: d.data() });
        });
      }
      return map;
    }

    const allCodes = Array.from(new Set(parsedRows.map((r) => r.code)));
    const existingMap = await fetchExistingByCodes(allCodes);

    const batch = db.batch();
    let stagedCount = 0;
    for (const r of parsedRows) {
      const existing = existingMap[r.code] || [];
      let shouldCreate = true;
      // if any existing doc with same code has identical name+price, skip
      for (const e of existing) {
        const d = e.data;
        const existingName = String(d.name ?? d.Name ?? "");
        const existingPrice = Number(d.price ?? d.Price ?? 0);
        if (existingName === r.name && existingPrice === r.price) {
          created.push({ id: e.id, data: d, skipped: true, existingId: e.id });
          shouldCreate = false;
          break;
        }
      }
      if (!shouldCreate) continue;

      const docRef = db.collection("products").doc();
      const data = {
        name: r.name,
        code: r.code,
        price: r.price,
        Name: r.name,
        Code: r.code,
        Price: r.price,
        uuid: randomUUID(),
        Promotion: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: user?.uid ?? user?.localId ?? null,
      };
      batch.set(docRef, data);
      stagedCount++;
      created.push({ id: docRef.id, data });
    }

    // commit only if we staged any writes
    if (stagedCount > 0) {
      await batch.commit();
    }

    return NextResponse.json({ ok: true, created });
  } catch (err: any) {
    return NextResponse.json(
      { error: String(err?.message || err) },
      { status: 500 },
    );
  }
}
