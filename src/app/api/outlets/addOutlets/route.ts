import { NextResponse } from "next/server";
import admin, { verifyIdToken } from "@/lib/auth/admin";
import { AUTH_TOKEN_KEY } from "@/lib/auth/constants";
import { z } from "zod";
import { randomUUID } from "crypto";

const OutletCreateSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  cashier: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
});

async function getTokenFromRequest(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth && auth.toLowerCase().startsWith("bearer "))
    return auth.split(" ")[1];
  const cookie = req.headers.get("cookie") || "";
  // avoid template literal parsing issues by concatenating
  const cookieRegex = new RegExp(AUTH_TOKEN_KEY + "=([^;]+)");
  const m = cookie.match(cookieRegex);
  if (m) return decodeURIComponent(m[1]);
  return null;
}

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

    const body = await req.json().catch(() => ({}));
    const parsed = OutletCreateSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json(
        { error: "validation_error", issues: parsed.error.format() },
        { status: 400 },
      );

    const { name, code, cashier, address, phone } = parsed.data;

    const db = admin.firestore();
    // check for existing by code
    const existingSnap = await db
      .collection("outlets")
      .where("code", "==", code)
      .limit(1)
      .get();
    if (!existingSnap.empty) {
      const doc = existingSnap.docs[0];
      const data = doc.data();
      const existingName = String(data.name ?? data.Name ?? "");
      const existingCashier = String(data.cashier ?? data.Cashier ?? "");
      const existingAddress = String(data.address ?? data.Address ?? "");
      const existingPhone = String(data.phone ?? data.Phone ?? "");
      // if identical (name + cashier + address + phone), skip
      if (
        existingName === name &&
        existingCashier === (cashier ?? "") &&
        existingAddress === (address ?? "") &&
        existingPhone === (phone ?? "")
      ) {
        return NextResponse.json({
          ok: true,
          skipped: true,
          id: doc.id,
          outlet: { id: doc.id, ...data },
        });
      }
      // else: create a new document (do not update existing)
    }

    const docRef = db.collection("outlets").doc();
    const data = {
      name,
      code,
      cashier: cashier ?? null,
      address: address ?? null,
      phone: phone ?? null,
      // TitleCase duplicates for UI compatibility
      Name: name,
      Code: code,
      Cashier: cashier ?? null,
      Address: address ?? null,
      Phone: phone ?? null,
      uuid: randomUUID(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: user?.uid ?? user?.localId ?? null,
    };

    await docRef.set(data);
    const created = await docRef.get();
    return NextResponse.json({
      ok: true,
      id: docRef.id,
      outlet: { id: created.id, ...created.data() },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: String(err?.message || err) },
      { status: 500 },
    );
  }
}
