import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { createSupabaseFetch } from "@/lib/supabase/fetch"
import { safeInternalPath } from "@/lib/utils"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash")
  const type = request.nextUrl.searchParams.get("type")
  const next = safeInternalPath(request.nextUrl.searchParams.get("next")) || "/auth/finish"
  if (!tokenHash || (type !== "email" && type !== "magiclink")) {
    const login = new URL("/iobm", request.nextUrl.origin)
    login.searchParams.set("error", "IoBM sign-in expired. Start again.")
    return NextResponse.redirect(login)
  }

  const finish = new URL(next, request.nextUrl.origin)
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
  const { error } = await supabase.auth.verifyOtp({
    type: "email",
    token_hash: tokenHash,
  })
  if (error) {
    const login = new URL("/iobm/login/student", request.nextUrl.origin)
    login.searchParams.set("error", error.message)
    return NextResponse.redirect(login)
  }
  return response
}
