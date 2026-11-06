import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase/server"
import { exchangeGoogleCode, googleUserEmail, saveGoogleConnection } from "@/lib/hiring/google-calendar"
import { userCanUseGoogleCalendar } from "@/lib/hiring/calendar-access"

export const runtime = "nodejs"

function decodeNext(state: string) {
  const parts = state.split(".")
  if (parts.length < 3) return "/profile"
  try {
    const path = Buffer.from(parts.slice(2).join("."), "base64url").toString("utf8")
    return path.startsWith("/") ? path : "/profile"
  } catch {
    return "/profile"
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const origin = url.origin
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")
  const oauthError = url.searchParams.get("error")

  const jar = await cookies()
  const expected = jar.get("gcal_oauth_state")?.value
  jar.delete("gcal_oauth_state")
  const nextPath = state ? decodeNext(state) : "/profile"
  const fail = (reason: string) =>
    NextResponse.redirect(new URL(`${nextPath}${nextPath.includes("?") ? "&" : "?"}calendar=${reason}`, origin))

  if (oauthError) return fail("denied")
  if (!code || !state) return fail("missing")
  if (!expected || expected !== state) return fail("state")

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(nextPath)}`, origin))
  if (!state.startsWith(`${user.id}.`)) return fail("state")
  if (!(await userCanUseGoogleCalendar(supabase, user.id))) return fail("forbidden")

  try {
    const tokens = await exchangeGoogleCode({ code, origin })
    const email = await googleUserEmail(tokens.access_token!)
    await saveGoogleConnection({
      recruiterId: user.id,
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
      email,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "connect"
    const reason = /storage isn’t set up/i.test(message) ? "setup" : "connect"
    return fail(reason)
  }

  return NextResponse.redirect(new URL(`${nextPath}${nextPath.includes("?") ? "&" : "?"}calendar=connected`, origin))
}
