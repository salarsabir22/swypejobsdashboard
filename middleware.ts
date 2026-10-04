import { NextResponse, type NextRequest } from "next/server"

const PUBLIC_PREFIXES = [
  "/login",
  "/signup",
  "/auth",
  "/forgot-password",
  "/reset-password",
  "/privacy",
  "/terms",
  "/candidates",
  "/company",
]

function isPublicJobDetail(pathname: string) {
  return /^\/jobs\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(pathname)
}

function isPublicPath(pathname: string) {
  return (
    pathname === "/" ||
    PUBLIC_PREFIXES.some((p) => pathname.startsWith(p)) ||
    isPublicJobDetail(pathname)
  )
}

function hasSupabaseSessionCookie(request: NextRequest) {
  return request.cookies.getAll().some((cookie) => {
    const name = cookie.name
    if (!/^sb-.+-auth-token(?:\.\d+)?$/.test(name)) return false
    return Boolean(cookie.value)
  })
}

/**
 * Cookie-only gate. Do not call Supabase here — `getUser()` is a network hop
 * and hangs on Vercel Edge (sin1), which surfaces as MIDDLEWARE_INVOCATION_TIMEOUT.
 * Session refresh and real auth checks stay in server layouts / pages.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isPublicPath(pathname) || pathname.startsWith("/api")) {
    return NextResponse.next()
  }

  if (!hasSupabaseSessionCookie(request)) {
    const login = new URL("/login", request.url)
    login.searchParams.set("next", pathname + request.nextUrl.search)
    return NextResponse.redirect(login)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}
