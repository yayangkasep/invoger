import { NextResponse } from "next/server";
import admin, { verifyIdToken } from "@/lib/auth/admin";
import { AUTH_TOKEN_KEY } from "@/lib/auth/constants";
import { z } from "zod";

const EditOutletSchema = z.object({
  id: z.string().min(1),
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

export async function POST(req: Request) {
  try {
    const token = await getTokenFromRequest(req);
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    try {
      await verifyIdToken(token);
    } catch (e) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = EditOutletSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json(
        { error: "validation_error", issues: parsed.error.format() },
        { status: 400 },
      );

    const { id, ...updatesRaw } = parsed.data as any;
    const { uuid: _discardUuid, ...updates } = updatesRaw as any;
    const db = admin.firestore();

    let docRef = db.collection("outlets").doc(id);
    const snap = await docRef.get();
    if (!snap.exists) {
      const uuidSnap = await db
        .collection("outlets")
        .where("uuid", "==", id)
        .limit(1)
        .get();
      if (uuidSnap.empty)
        return NextResponse.json({ error: "not_found" }, { status: 404 });
      docRef = uuidSnap.docs[0].ref;
    }

    await docRef.update({
      ...updates,
      Name: updates.name ?? undefined,
      Code: updates.code ?? undefined,
      Cashier: updates.cashier ?? undefined,
      Address: updates.address ?? undefined,
      Phone: updates.phone ?? undefined,
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
