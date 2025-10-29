import { NextResponse } from "next/server";
import admin, { verifyIdToken } from "@/lib/auth/admin";
import { randomUUID } from "crypto";
import { AUTH_TOKEN_KEY } from "@/lib/auth/constants";
import { z } from "zod";

const PromotionCreateSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["by%", "discount", "buy2"]).optional(),
  value: z
    .preprocess((v) => (v === "" ? undefined : v), z.number().optional())
    .default(0),
  minQty: z
    .preprocess((v) => (v === "" ? undefined : v), z.number().optional())
    .optional(),
  price: z
    .preprocess((v) => (v === "" ? undefined : v), z.number().optional())
    .optional(),
  promoText: z.string().nullable().optional(),
});

async function getTokenFromRequest(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth && auth.toLowerCase().startsWith("bearer ")) return auth.split(" ")[1];
  const cookie = req.headers.get("cookie") || "";
  const m = cookie.match(new RegExp(`${AUTH_TOKEN_KEY}=([^;]+)`));
  if (m) return decodeURIComponent(m[1]);
  return null;
}

export async function POST(req: Request) {
  try {
    const token = await getTokenFromRequest(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let user: any = null;
    try {
      user = await verifyIdToken(token);
    } catch (e) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = PromotionCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "validation_error", issues: parsed.error.format() }, { status: 400 });
    }

  const { name, type, value, minQty, price, promoText } = parsed.data as any;

    const db = admin.firestore();

    const docRef = await db.collection("promotions").add({
      name,
      Name: name,
      type: type ?? null,
      value: typeof value === "number" ? value : Number(value || 0),
      minQty: typeof minQty === "number" ? minQty : minQty ?? null,
      price: typeof price === "number" ? price : price ?? null,
      promoText: promoText ?? null,
      code: promoText ?? null, // legacy
      discount: type === "by%" ? (typeof value === "number" ? value : Number(value || 0)) : null, // legacy percent
      uuid: randomUUID(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: user?.uid ?? user?.localId ?? null,
    });

    const created = await docRef.get();
    return NextResponse.json({ ok: true, id: docRef.id, promotion: { id: created.id, ...created.data() } });
  } catch (err: any) {
    return NextResponse.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
