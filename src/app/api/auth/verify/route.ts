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

export async function GET(req: Request) {
  try {
    const token = await getTokenFromRequest(req);
    if (!token) return NextResponse.json({ ok: false }, { status: 401 });
    try {
      await verifyIdToken(token);
      return NextResponse.json({ ok: true });
    } catch (e) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  } catch (err: any) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
