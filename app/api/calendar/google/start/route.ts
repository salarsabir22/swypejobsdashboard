import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { googleAuthUrl, googleCalendarConfigured } from "@/lib/hiring/google-calendar"
import { userCanUseGoogleCalendar } from "@/lib/hiring/calendar-access"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const url = new URL(request.url)
  const nextPath = url.searchParams.get("next")?.startsWith("/") ? url.searchParams.get("next")! : "/profile"

  if (!user) return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(nextPath)}`, request.url))

  if (!(await userCanUseGoogleCalendar(supabase, user.id))) {
    return NextResponse.redirect(new URL(`${nextPath}${nextPath.includes("?") ? "&" : "?"}calendar=forbidden`, request.url))
  }

  if (!googleCalendarConfigured()) {
    return NextResponse.redirect(new URL(`${nextPath}${nextPath.includes("?") ? "&" : "?"}calendar=unconfigured`, request.url))
  }

  const origin = url.origin
  const nonce = crypto.randomUUID()
  const state = `${user.id}.${nonce}.${Buffer.from(nextPath).toString("base64url")}`
  const jar = await cookies()
  jar.set("gcal_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: origin.startsWith("https"),
    maxAge: 600,
    path: "/",
  })

  return NextResponse.redirect(googleAuthUrl({ origin, state }))
}
