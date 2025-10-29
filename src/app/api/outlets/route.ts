import { NextResponse } from "next/server";
import admin, { verifyIdToken } from "@/lib/auth/admin";
import { AUTH_TOKEN_KEY } from "@/lib/auth/constants";
import { z } from "zod";

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
  const m = cookie.match(new RegExp(`${AUTH_TOKEN_KEY}=([^;]+)`));
  if (m) return decodeURIComponent(m[1]);
  return null;
}

// GET /api/outlets -> list outlets
export async function GET(req: Request) {
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

    const db = admin.firestore();

    // allow filtering by query params: ?code=XXX&name=YYY&cashier=ZZZ&limit=100
    const url = new URL(req.url);
    const code = url.searchParams.get("code")?.trim() || null;
    const name = url.searchParams.get("name")?.trim() || null;
    const cashier = url.searchParams.get("cashier")?.trim() || null;
    const limitParam = Number(url.searchParams.get("limit") || "500");
    const limit =
      Number.isFinite(limitParam) && limitParam > 0
        ? Math.min(limitParam, 1000)
        : 500;

    // Build Firestore query: we can do equality filters (code, cashier) server-side.
    // For 'name' substring matching, Firestore text contains requires indexing or a different search system;
    // here we'll fetch a bounded set and filter in-memory by substring (case-insensitive).
    let q: FirebaseFirestore.Query = db
      .collection("outlets")
      .orderBy("createdAt", "desc");
    if (code) q = q.where("code", "==", code);
    if (cashier) q = q.where("cashier", "==", cashier);
    q = q.limit(limit);

    const snap = await q.get();
    let outlets = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    if (name) {
      const nameLower = name.toLowerCase();
      outlets = outlets.filter((o: any) =>
        String(o.name || o.Name || "")
          .toLowerCase()
          .includes(nameLower),
      );
    }

    return NextResponse.json({ ok: true, outlets });
  } catch (err: any) {
    return NextResponse.json(
      { error: String(err?.message || err) },
      { status: 500 },
    );
  }
}
