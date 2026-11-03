import { NextResponse, type NextRequest } from "next/server"
import { isIobmPortal, staffRoleOf } from "@/lib/sso/iobm"
import { newNonce, writeIobmSsoState } from "@/lib/sso/state"

export const dynamic = "force-dynamic"

function fail(request: NextRequest, portal: string, message: string) {
  const dest = new URL(`/iobm/login/${portal || "student"}`, request.nextUrl.origin)
  dest.searchParams.set("error", message)
  return NextResponse.redirect(dest)
}

export async function GET(request: NextRequest) {
  const portalRaw = request.nextUrl.searchParams.get("portal") || "student"
  if (!isIobmPortal(portalRaw)) return fail(request, "student", "Unknown IoBM login.")
  if (portalRaw === "employer") {
    return NextResponse.redirect(new URL("/iobm/login/employer", request.nextUrl.origin))
  }

  const staffRole = portalRaw === "faculty" ? staffRoleOf(request.nextUrl.searchParams.get("staff_role")) : undefined
  const identityClaim = request.nextUrl.searchParams.get("claim") === "1"
  const nonce = newNonce()
  await writeIobmSsoState({
    portal: portalRaw,
    staffRole,
    identityClaim,
    nonce,
    next: request.nextUrl.searchParams.get("next") || undefined,
  })

  const origin = request.nextUrl.origin
  const oidcIssuer = process.env.IOBM_OIDC_ISSUER?.replace(/\/$/, "")
  const oidcClientId = process.env.IOBM_OIDC_CLIENT_ID
  const samlSso = process.env.IOBM_SAML_IDP_SSO_URL

  if (oidcIssuer && oidcClientId) {
    try {
      const discovery = await fetch(`${oidcIssuer}/.well-known/openid-configuration`, { cache: "no-store" })
      if (!discovery.ok) throw new Error("OIDC discovery failed")
      const conf = (await discovery.json()) as { authorization_endpoint?: string }
      if (!conf.authorization_endpoint) throw new Error("No authorization endpoint")
      const auth = new URL(conf.authorization_endpoint)
      auth.searchParams.set("client_id", oidcClientId)
      auth.searchParams.set("redirect_uri", `${origin}/api/sso/iobm/oidc/callback`)
      auth.searchParams.set("response_type", "code")
      auth.searchParams.set("scope", "openid email profile")
      auth.searchParams.set("state", nonce)
      auth.searchParams.set("nonce", nonce)
      return NextResponse.redirect(auth)
    } catch {
      return fail(request, portalRaw, "IoBM OIDC is not reachable. Try again or use Google campus sign-in.")
    }
  }

  if (samlSso) {
    const sso = new URL(samlSso)
    sso.searchParams.set("RelayState", nonce)
    return NextResponse.redirect(sso)
  }

  const google = new URL("/iobm/sso/google", origin)
  google.searchParams.set("portal", portalRaw)
  if (staffRole) google.searchParams.set("staff_role", staffRole)
  if (identityClaim) google.searchParams.set("claim", "1")
  return NextResponse.redirect(google)
}
