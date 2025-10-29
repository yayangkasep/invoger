import { NextResponse, NextRequest } from "next/server";
import admin, { verifyIdToken } from "@/lib/auth/admin";
import { AUTH_TOKEN_KEY } from "@/lib/auth/constants";

async function getTokenFromRequest(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth && auth.toLowerCase().startsWith("bearer ")) return auth.split(" ")[1];
  const cookie = req.headers.get("cookie") || "";
  const m = cookie.match(new RegExp(`${AUTH_TOKEN_KEY}=([^;]+)`));
  if (m) return decodeURIComponent(m[1]);
  return null;
}

// Next 15: context.params is now a Promise
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const token = await getTokenFromRequest(req);
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decodedToken = await verifyIdToken(token);
    if (!decodedToken)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const db = admin.firestore();
    const doc = await db.collection("promotions").doc(id).get();

    if (!doc.exists)
      return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({
      ok: true,
      promotion: { id: doc.id, ...doc.data() },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: String(err?.message || err) },
      { status: 500 }
    );
  }
}