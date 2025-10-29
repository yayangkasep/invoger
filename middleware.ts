import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_TOKEN_KEY } from "./src/lib/auth/constants";

async function verifyTokenWithRest(idToken?: string) {
  if (!idToken) return null;
  const FIREBASE_API_KEY =
    process.env.FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  if (!FIREBASE_API_KEY) return null;

  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      },
    );
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    return data?.users?.[0] || null;
  } catch {
    return null;
  }
}

function getTokenFromReq(req: Request | import("next/server").NextRequest) {
  const cookieToken =
    (req as any).cookies?.get?.(AUTH_TOKEN_KEY)?.value ?? undefined;
  const authHeader = (req as any).headers?.get?.("authorization");
  const bearerMatch = authHeader?.match?.(/^Bearer\s+(.+)$/i);
  const headerToken = bearerMatch ? bearerMatch[1] : undefined;
  return cookieToken || headerToken;
}

export async function middleware(req: NextRequest) {
  console.log(">>> middleware running for:", req.nextUrl.pathname);

  const { pathname } = req.nextUrl;
  const url = req.nextUrl.clone();
  // Dev-time console logging to help debugging middleware decisions
  try {
    const cookieToken = req.cookies.get(AUTH_TOKEN_KEY)?.value;
    const authHeader = req.headers.get("authorization");
    const bearerMatch = authHeader?.match(/^Bearer\s+(.+)$/i);
    const headerToken = bearerMatch ? bearerMatch[1] : undefined;
    const token = cookieToken || headerToken;
    const tokenSnippet = token ? String(token).slice(0, 8) + "…" : null;
    const envHasApiKey = Boolean(
      process.env.FIREBASE_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    );
     
    console.debug(
      "[middleware] pathname=",
      pathname,
      "tokenSnippet=",
      tokenSnippet,
      "envHasApiKey=",
      envHasApiKey,
    );
  } catch (_) {}

  // If user visits root/login pages, redirect authenticated users to dashboard
  if (pathname === "/" || pathname === "/page" || pathname === "/login") {
    const token = getTokenFromReq(req);

    if (!token) return NextResponse.next();

    const user = await verifyTokenWithRest(token);
    if (user) {
      url.pathname = "/menu/Dashboard";
      return NextResponse.redirect(url);
    }

    // invalid token -> clear cookie and continue to login
    const res = NextResponse.next();
    res.headers.set(
      "Set-Cookie",
      `${AUTH_TOKEN_KEY}=; Path=/; Max-Age=0; HttpOnly; SameSite=${process.env.NODE_ENV === "production" ? "None" : "Lax"}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
    );
    return res;
  }

  // hanya proteksi halaman yang di bawah /menu/
  if (!pathname.startsWith("/menu")) return NextResponse.next();

  const token = getTokenFromReq(req);

  if (!token) {
    url.pathname = "/";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const user = await verifyTokenWithRest(token);
  if (!user) {
    url.pathname = "/";
    url.searchParams.set("next", pathname);
    const res = NextResponse.redirect(url);
    res.headers.set(
      "Set-Cookie",
      `${AUTH_TOKEN_KEY}=; Path=/; Max-Age=0; HttpOnly; SameSite=${process.env.NODE_ENV === "production" ? "None" : "Lax"}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
    );
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/menu/:path*"],
};
