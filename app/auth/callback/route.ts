import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { createSupabaseFetch } from "@/lib/supabase/fetch"

export const dynamic = "force-dynamic"

function finishUrl(request: NextRequest) {
  const finish = new URL("/auth/finish", request.nextUrl.origin)
  request.nextUrl.searchParams.forEach((value, key) => {
    if (key !== "code") finish.searchParams.set(key, value)
  })
  return finish
}

/**
 * Exchange the PKCE code on the server, where the verifier cookie from
 * signInWithOAuth is on the request. The browser page cannot see that cookie
 * when the code was forwarded from another origin.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")
  const finish = finishUrl(request)
  if (!code) return NextResponse.redirect(finish)

  const response = NextResponse.redirect(finish)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: { fetch: createSupabaseFetch() },
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    const login = new URL("/login", request.nextUrl.origin)
    const message = error.message.toLowerCase().includes("code verifier")
      ? "Google sign-in expired. Start it again from this page, in the same browser."
      : error.message
    login.searchParams.set("error", message)
    return NextResponse.redirect(login)
  }

  return response
}
