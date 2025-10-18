import { NextResponse } from 'next/server'
import { loginWithEmailPassword } from '@/lib/auth/api'

// POST /api/login
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { email, password } = body || {}
    if (!email || !password) {
      return NextResponse.json({ error: 'email and password are required' }, { status: 400 })
    }

    const res = await loginWithEmailPassword(email, password)

    // Set HttpOnly cookie with idToken. Adjust cookie options as needed.
    const cookieOptions: Record<string, unknown> = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      // expires in seconds from now (expiresIn is string seconds)
      maxAge: res?.expiresIn ? parseInt(res.expiresIn, 10) : undefined,
    }

  // Return idToken to the client (in addition to setting HttpOnly cookie) so
  // the frontend can store the token in localStorage if desired.
  const response = NextResponse.json({ ok: true, email: res.email, localId: res.localId, idToken: res.idToken, expiresIn: res.expiresIn })
    // NextResponse doesn't provide a typed set-cookie helper here, use headers
  response.cookies.set('invoger_token', res.idToken, cookieOptions as unknown as Record<string, string | number | boolean | undefined>)

    return response
  } catch (err: unknown) {
    // log and return a safe error message
    // eslint-disable-next-line no-console
    console.error('login error', err)
    const message = err && typeof err === 'object' && 'message' in err && typeof (err as { message?: unknown }).message === 'string'
      ? (err as { message: string }).message
      : 'login failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
