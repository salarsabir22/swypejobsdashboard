import { NextResponse, type NextRequest } from "next/server"
import { claimsFromOidcProfile } from "@/lib/sso/claims"
import { campusSsoRequiresIobmEmail, isIobmCampusEmail } from "@/lib/sso/iobm"
import { magicLinkForIobmUser } from "@/lib/sso/session"
import { readIobmSsoState } from "@/lib/sso/state"

export const dynamic = "force-dynamic"

function loginError(origin: string, message: string) {
  const dest = new URL("/iobm/login/student", origin)
  dest.searchParams.set("error", message)
  return NextResponse.redirect(dest)
}

export async function GET(request: NextRequest) {
  const issuer = process.env.IOBM_OIDC_ISSUER?.replace(/\/$/, "")
  const clientId = process.env.IOBM_OIDC_CLIENT_ID
  const clientSecret = process.env.IOBM_OIDC_CLIENT_SECRET
  if (!issuer || !clientId || !clientSecret) {
    return NextResponse.json({ error: "IoBM OIDC is not configured." }, { status: 503 })
  }
  const error = request.nextUrl.searchParams.get("error_description") || request.nextUrl.searchParams.get("error")
  if (error) return loginError(request.nextUrl.origin, error)
  const code = request.nextUrl.searchParams.get("code")
  const state = request.nextUrl.searchParams.get("state")
  const saved = await readIobmSsoState()
  if (!code || !saved || saved.nonce !== state) {
    return loginError(request.nextUrl.origin, "IoBM sign-in expired. Start again from this campus.")
  }
  try {
    const discovery = await fetch(`${issuer}/.well-known/openid-configuration`, { cache: "no-store" })
    const conf = (await discovery.json()) as { token_endpoint?: string; userinfo_endpoint?: string }
    if (!conf.token_endpoint || !conf.userinfo_endpoint) throw new Error("IoBM OIDC discovery is incomplete.")
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: `${request.nextUrl.origin}/api/sso/iobm/oidc/callback`,
      client_id: clientId,
      client_secret: clientSecret,
    })
    const tokenRes = await fetch(conf.token_endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    })
    const tokenJson = (await tokenRes.json()) as { access_token?: string; error_description?: string }
    if (!tokenRes.ok || !tokenJson.access_token) {
      throw new Error(tokenJson.error_description || "IoBM token exchange failed.")
    }
    const userRes = await fetch(conf.userinfo_endpoint, {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` },
    })
    const profile = (await userRes.json()) as Record<string, unknown>
    const claims = claimsFromOidcProfile(profile)
    if (campusSsoRequiresIobmEmail(saved.portal, saved.identityClaim) && !isIobmCampusEmail(claims.email)) {
      return loginError(request.nextUrl.origin, "Use your IoBM campus email for this login.")
    }
    const dest = await magicLinkForIobmUser({
      email: claims.email,
      fullName: claims.fullName,
      origin: request.nextUrl.origin,
      portal: saved.portal,
      staffRole: saved.staffRole,
      identityClaim: saved.identityClaim,
    })
    return NextResponse.redirect(dest)
  } catch (err) {
    return loginError(request.nextUrl.origin, err instanceof Error ? err.message : "IoBM OIDC sign-in failed.")
  }
}
