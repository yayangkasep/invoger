import { NextResponse } from "next/server";
import admin, { verifyIdToken } from "@/lib/auth/admin";
import { AUTH_TOKEN_KEY } from "@/lib/auth/constants";

async function getTokenFromRequest(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth && auth.toLowerCase().startsWith("bearer "))
    return auth.split(" ")[1];
  const cookie = req.headers.get("cookie") || "";
  const m = cookie.match(new RegExp(`${AUTH_TOKEN_KEY}=([^;]+)`));
  if (m) return decodeURIComponent(m[1]);
  return null;
}

// POST /api/products/deleteProducts -> { id }
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
    const id = body?.id;
    if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

    const db = admin.firestore();
    let docRef = db.collection("products").doc(String(id));
    const snap = await docRef.get();
    if (!snap.exists) {
      // try lookup by uuid
      const uuidSnap = await db
        .collection("products")
        .where("uuid", "==", String(id))
        .limit(1)
        .get();
      if (uuidSnap.empty)
        return NextResponse.json({ error: "not_found" }, { status: 404 });
      docRef = uuidSnap.docs[0].ref;
    }
    await docRef.delete();
    // return the deleted document id so clients can update local state by doc id
    return NextResponse.json({ ok: true, id: docRef.id });
  } catch (err: any) {
    return NextResponse.json(
      { error: String(err?.message || err) },
      { status: 500 },
    );
  }
}
