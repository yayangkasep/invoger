import { NextResponse } from "next/server";
import admin, { verifyIdToken } from "@/lib/auth/admin";
import { AUTH_TOKEN_KEY } from "@/lib/auth/constants";
import { z } from "zod";

const EditProductSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  price: z.preprocess((v) => (v === "" ? undefined : v), z.number().optional()),
  description: z.string().nullable().optional(),
  meta: z.any().nullable().optional(),
  Promotion: z.string().nullable().optional(),
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

// POST /api/products/editProducts -> update product by id
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
    const parsed = EditProductSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "validation_error", issues: parsed.error.format() },
        { status: 400 },
      );
    }

    const { id, ...updatesRaw } = parsed.data;
    // Prevent changing uuid from client-side updates
    const { uuid: _discardUuid, ...updates } = updatesRaw as any;
    const db = admin.firestore();

    let docRef = db.collection("products").doc(id);
    const snap = await docRef.get();
    // if doc not found by id, try lookup by uuid
    if (!snap.exists) {
      const uuidSnap = await db
        .collection("products")
        .where("uuid", "==", id)
        .limit(1)
        .get();
      if (uuidSnap.empty)
        return NextResponse.json({ error: "not_found" }, { status: 404 });
      docRef = uuidSnap.docs[0].ref;
    }

    await docRef.update({
      ...updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: user?.uid ?? user?.localId ?? null,
    });

    const updated = await docRef.get();
    return NextResponse.json({
      ok: true,
      product: { id: updated.id, ...updated.data() },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: String(err?.message || err) },
      { status: 500 },
    );
  }
}
