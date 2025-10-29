import { NextResponse } from "next/server";
import { AUTH_TOKEN_KEY } from "@/lib/auth/constants";

export async function POST(req: Request) {
  // Clear the HttpOnly cookie by setting Max-Age=0 and matching SameSite/Secure
  const res = NextResponse.json({ ok: true });
  const sameSite = process.env.NODE_ENV === "production" ? "None" : "Lax";
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.headers.set(
    "Set-Cookie",
    `${AUTH_TOKEN_KEY}=; Path=/; Max-Age=0; HttpOnly; SameSite=${sameSite}${secure}`,
  );
  return res;
}

export async function GET(req: Request) {
  return POST(req);
}
