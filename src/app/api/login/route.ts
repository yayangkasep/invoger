import { NextResponse } from "next/server";
import { loginWithEmailPassword } from "@/lib/auth/api";
import {
  AUTH_TOKEN_KEY,
  AUTH_EXPIRES_IN,
  AUTH_FORCE_EXPIRES_IN,
} from "@/lib/auth/constants";

// POST /api/login
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body || {};
    if (!email || !password) {
      return NextResponse.json(
        { error: "email and password are required" },
        { status: 400 },
      );
    }

    const res = await loginWithEmailPassword(email, password);

    // Set HttpOnly cookie with idToken. Adjust cookie options as needed.
    // Explicit cookie options. Important: SameSite=None is required for some
    // hosting/preview domains (Vercel preview URLs) so the browser will accept
    // the Set-Cookie header. SameSite=None requires Secure to be true.
    const cookieOptions: Record<string, any> = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",

      // expires in seconds from now (expiresIn is string seconds)
      // prefer provider response unless AUTH_FORCE_EXPIRES_IN is true
      maxAge: AUTH_FORCE_EXPIRES_IN
        ? parseInt(AUTH_EXPIRES_IN, 10)
        : res?.expiresIn
          ? parseInt(res.expiresIn, 10)
          : parseInt(AUTH_EXPIRES_IN, 10),
    };

    // Return idToken to the client (in addition to setting HttpOnly cookie) so
    // the frontend can store the token in localStorage if desired.
    const response = NextResponse.json({
      ok: true,
      email: res.email,
      localId: res.localId,
      idToken: res.idToken,
      expiresIn: AUTH_FORCE_EXPIRES_IN
        ? AUTH_EXPIRES_IN
        : (res.expiresIn ?? AUTH_EXPIRES_IN),
    });

    // NextResponse doesn't provide a typed set-cookie helper here, use headers
    // Set cookie using NextResponse cookie helper. This will emit Set-Cookie
    // with the attributes above.
    response.cookies.set(AUTH_TOKEN_KEY, res.idToken, cookieOptions);

    return response;
  } catch (err: unknown) {
    // log and return a safe error message
     
    console.error("Login error", err);
    const message =
      err &&
      typeof err === "object" &&
      "message" in err &&
      typeof (err as { message?: unknown }).message === "string"
        ? (err as { message: string }).message
        : "Login failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
