import { NextResponse } from "next/server";
import admin, { verifyIdToken } from "@/lib/auth/admin";
import { randomUUID } from "crypto";
import { AUTH_TOKEN_KEY } from "@/lib/auth/constants";
import { z } from "zod";

const ProductCreateSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  price: z
    .preprocess((v) => (v === "" ? undefined : v), z.number().optional())
    .default(0),
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

// POST /api/products/add -> create product with fields: name, code, price
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
    const parsed = ProductCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "validation_error", issues: parsed.error.format() },
        { status: 400 },
      );
    }

    const { name, code, price } = parsed.data;

    const db = admin.firestore();

    // Check existing products with same code
    const existingSnap = await db
      .collection("products")
      .where("code", "==", code)
      .limit(1)
      .get();
    if (!existingSnap.empty) {
      const doc = existingSnap.docs[0];
      const data = doc.data();
      const existingName = data.name ?? data.Name ?? "";
      const existingPrice = Number(data.price ?? data.Price ?? 0);
      const newPrice = typeof price === "number" ? price : Number(price || 0);
      // If identical, skip creation and return existing
      if (
        String(existingName) === String(name) &&
        Number(existingPrice) === Number(newPrice)
      ) {
        return NextResponse.json({
          ok: true,
          skipped: true,
          id: doc.id,
          product: { id: doc.id, ...data },
        });
      }
      // else: fallthrough and create a new document (we intentionally do not update existing)
    }

    // Write both normalized (lowercase) and UI-friendly (TitleCase) keys so
    // existing frontend normalization picks up the expected fields (Code, Name, Price)
    const docRef = await db.collection("products").add({
      // lowercase canonical fields
      name,
      code,
      price: typeof price === "number" ? price : Number(price || 0),
      // TitleCase duplicates for UI that expects e.g. `Code` or `Price`
      Name: name,
      Code: code,
      Price: typeof price === "number" ? price : Number(price || 0),
      // server-side uuid for stable linking
      uuid: randomUUID(),
      // optional Promotion field (if provided in request body)
      Promotion: (body && (body as any).Promotion) ?? null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: user?.uid ?? user?.localId ?? null,
    });

    const created = await docRef.get();
    return NextResponse.json({
      ok: true,
      id: docRef.id,
      product: { id: created.id, ...created.data() },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: String(err?.message || err) },
      { status: 500 },
    );
  }
}
