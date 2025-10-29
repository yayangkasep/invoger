import { NextResponse } from "next/server";
import admin, { verifyIdToken } from "@/lib/auth/admin";
import { AUTH_TOKEN_KEY } from "@/lib/auth/constants";
import { z } from "zod";

const ProductCreateSchema = z.object({
  name: z.string().min(1),
  price: z
    .preprocess((v) => (v === "" ? undefined : v), z.number().optional())
    .default(0),
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

// GET /api/products -> list products
export async function GET(req: Request) {
  try {
    const token = await getTokenFromRequest(req);
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // verify token (admin SDK or REST fallback)
    let user: any = null;
    try {
      user = await verifyIdToken(token);
    } catch (e) {
      // treat as unauthorized
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Firestore collection
    const db = admin.firestore();
    const snap = await db
      .collection("products")
      .orderBy("createdAt", "desc")
      .limit(500)
      .get();
    const products = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ DATA: true, products });
  } catch (err: any) {
    return NextResponse.json(
      { error: String(err?.message || err) },
      { status: 500 },
    );
  }
}
