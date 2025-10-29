import { NextResponse } from "next/server";
import admin, { verifyIdToken } from "@/lib/auth/admin";
import { AUTH_TOKEN_KEY } from "@/lib/auth/constants";
import { randomUUID } from "crypto";

async function getTokenFromRequest(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth && auth.toLowerCase().startsWith("bearer "))
    return auth.split(" ")[1];
  const cookie = req.headers.get("cookie") || "";
  const m = cookie.match(new RegExp(`${AUTH_TOKEN_KEY}=([^;]+)`));
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
    const rows = Array.isArray(body?.rows) ? body.rows : [];
    if (rows.length === 0) return NextResponse.json({ ok: true, created: [] });

    const db = admin.firestore();
    const batch = db.batch();
    const created: Array<any> = [];
    for (const r of rows) {
      const docRef = db.collection("outlets").doc();
      const data = {
        name: r.name,
        code: r.code,
        cashier: r.cashier ?? null,
        address: r.address ?? null,
        phone: r.phone ?? null,
        Name: r.name,
        Code: r.code,
        Cashier: r.cashier ?? null,
        Address: r.address ?? null,
        Phone: r.phone ?? null,
        uuid: randomUUID(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        createdBy: user?.uid ?? user?.localId ?? null,
      };
      batch.set(docRef, data);
      created.push({ id: docRef.id, data });
    }
    if (created.length) await batch.commit();
    return NextResponse.json({ ok: true, created });
  } catch (err: any) {
    return NextResponse.json(
      { error: String(err?.message || err) },
      { status: 500 },
    );
  }
}
