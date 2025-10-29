import { NextResponse } from "next/server";
import admin, { verifyIdToken } from "@/lib/auth/admin";
import { AUTH_TOKEN_KEY } from "@/lib/auth/constants";
import { z } from "zod";

const OutletUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  cashier: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
});

async function getTokenFromRequest(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth && auth.toLowerCase().startsWith("bearer "))
    return auth.split(" ")[1];
  const cookie = req.headers.get("cookie") || "";
  const m = cookie.match(new RegExp(`${AUTH_TOKEN_KEY}=([^;]+)`));
  if (m) return decodeURIComponent(m[1]);
  return null;
}

export async function GET(req: Request, context: any) {
  try {
    const { id } = context?.params || {};
    const db = admin.firestore();
    // try doc id first
    let doc = await db.collection("outlets").doc(id).get();
    if (!doc.exists) {
      // fallback to uuid
      const uuidSnap = await db
        .collection("outlets")
        .where("uuid", "==", String(id))
        .limit(1)
        .get();
      if (uuidSnap.empty)
        return NextResponse.json({ error: "not_found" }, { status: 404 });
      doc = uuidSnap.docs[0];
    }
    return NextResponse.json({
      ok: true,
      outlet: { id: doc.id, ...doc.data() },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: String(err?.message || err) },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request, context: any) {
  try {
    const token = await getTokenFromRequest(req);
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    try {
      await verifyIdToken(token);
    } catch (e) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = context?.params || {};
    const body = await req.json().catch(() => ({}));
    const parsed = OutletUpdateSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json(
        { error: "validation_error", issues: parsed.error.format() },
        { status: 400 },
      );

    const db = admin.firestore();
    const docRef = db.collection("outlets").doc(id);
    const snap = await docRef.get();
    if (!snap.exists)
      return NextResponse.json({ error: "not_found" }, { status: 404 });

    await docRef.update({
      ...parsed.data,
      Name: parsed.data.name ?? undefined,
      Code: parsed.data.code ?? undefined,
      Cashier: parsed.data.cashier ?? undefined,
      Address: parsed.data.address ?? undefined,
      Phone: parsed.data.phone ?? undefined,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const updated = await docRef.get();
    return NextResponse.json({
      ok: true,
      outlet: { id: updated.id, ...updated.data() },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: String(err?.message || err) },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request, context: any) {
  try {
    const token = await getTokenFromRequest(req);
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    try {
      await verifyIdToken(token);
    } catch (e) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = context?.params || {};
    const db = admin.firestore();
    const docRef = db.collection("outlets").doc(id);
    const snap = await docRef.get();
    if (!snap.exists)
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    await docRef.delete();
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: String(err?.message || err) },
      { status: 500 },
    );
  }
}
