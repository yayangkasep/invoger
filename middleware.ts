import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Protect all /menu/* routes
export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone()
  const { pathname } = req.nextUrl

  // only protect /menu/*
  if (!pathname.startsWith('/menu')) return NextResponse.next()

  // Try cookie first (server-set HttpOnly cookie named invoger_token)
  const cookieToken = req.cookies.get('invoger_token')?.value

  // Also allow Authorization: Bearer <token>
  const authHeader = req.headers.get('authorization')
  const bearerMatch = authHeader?.match(/^Bearer\s+(.+)$/i)
  const headerToken = bearerMatch ? bearerMatch[1] : undefined

  const token = cookieToken || headerToken

  if (!token) {
    // Not authenticated – redirect to login with next param
    url.pathname = '/'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  try {
    // Lazy-import Firebase Admin verify to avoid initialization at module load
    // (prevents crashes when service account isn't configured during dev).
    const mod = await import('./src/lib/auth/admin')
    const verifyIdToken = mod.verifyIdToken
    if (!verifyIdToken) throw new Error('verifyIdToken not available')
    await verifyIdToken(token)
    return NextResponse.next()
  } catch (err) {
    // If verification fails or Admin SDK isn't configured, redirect to login.
    url.pathname = '/'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }
}

export const config = {
  matcher: ['/menu/:path*'],
}
