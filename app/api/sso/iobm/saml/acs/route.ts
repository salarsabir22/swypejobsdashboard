import { NextResponse, type NextRequest } from "next/server"
import { claimsFromSamlXml } from "@/lib/sso/claims"
import { campusSsoRequiresIobmEmail, isIobmCampusEmail } from "@/lib/sso/iobm"
import { magicLinkForIobmUser } from "@/lib/sso/session"
import { readIobmSsoState } from "@/lib/sso/state"

export const dynamic = "force-dynamic"

function loginError(origin: string, message: string) {
  const dest = new URL("/iobm/login/student", origin)
  dest.searchParams.set("error", message)
  return NextResponse.redirect(dest)
}

export async function POST(request: NextRequest) {
  if (!process.env.IOBM_SAML_IDP_SSO_URL && process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "IoBM SAML is not configured." }, { status: 503 })
  }
  const form = await request.formData()
  const encoded = String(form.get("SAMLResponse") || "")
  if (!encoded) return loginError(request.nextUrl.origin, "IoBM SAML did not return a response.")
  let xml = ""
  try {
    xml = Buffer.from(encoded, "base64").toString("utf8")
  } catch {
    return loginError(request.nextUrl.origin, "IoBM SAML response was invalid.")
  }
  if (process.env.NODE_ENV === "production" && !process.env.IOBM_SAML_CERT) {
    return NextResponse.json(
      { error: "Set IOBM_SAML_CERT before accepting campus assertions in production." },
      { status: 503 }
    )
  }
  let claims
  try {
    claims = claimsFromSamlXml(xml)
  } catch (err) {
    return loginError(request.nextUrl.origin, err instanceof Error ? err.message : "Could not read IoBM SAML.")
  }
  const state = await readIobmSsoState()
  const portal = state?.portal || "student"
  if (campusSsoRequiresIobmEmail(portal, state?.identityClaim) && !isIobmCampusEmail(claims.email)) {
    return loginError(request.nextUrl.origin, "Use your IoBM campus email for this login.")
  }
  try {
    const dest = await magicLinkForIobmUser({
      email: claims.email,
      fullName: claims.fullName,
      origin: request.nextUrl.origin,
      portal,
      staffRole: state?.staffRole,
      identityClaim: state?.identityClaim,
    })
    return NextResponse.redirect(dest)
  } catch (err) {
    return loginError(request.nextUrl.origin, err instanceof Error ? err.message : "Could not open an IoBM session.")
  }
}
