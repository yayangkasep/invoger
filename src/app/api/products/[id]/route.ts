import { NextResponse } from "next/server";
import admin, { verifyIdToken } from "@/lib/auth/admin";
import { AUTH_TOKEN_KEY } from "@/lib/auth/constants";
import { z } from "zod";

const ProductUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  price: z.preprocess((v) => (v === "" ? undefined : v), z.number().optional()),
  description: z.string().nullable().optional(),
  meta: z.any().nullable().optional(),
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
    const id = context?.params?.id;
    const db = admin.firestore();
    // try lookup by document id first
    let doc = await db.collection("products").doc(id).get();
    if (!doc.exists) {
      // fallback: lookup by server-generated uuid
      const uuidSnap = await db
        .collection("products")
        .where("uuid", "==", String(id))
        .limit(1)
        .get();
      if (uuidSnap.empty)
        return NextResponse.json({ error: "not_found" }, { status: 404 });
      doc = uuidSnap.docs[0];
    }
    return NextResponse.json({
      ok: true,
      product: { id: doc.id, ...doc.data() },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: String(err?.message || err) },
      { status: 500 },
    );
  }
}
