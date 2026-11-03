import { createAdminClient } from "@/lib/supabase/admin"
import { isIobmPortal, type IobmPortal } from "@/lib/sso/iobm"
import { resolveSsoSubject, type SsoProvider } from "@/lib/sso/identity"

export function iobmFinishPath(opts: {
  portal: IobmPortal
  staffRole?: string
  identityClaim?: boolean
  next?: string | null
}) {
  const params = new URLSearchParams({ sso: "iobm", portal: opts.portal })
  if (opts.staffRole) params.set("staff_role", opts.staffRole)
  if (opts.identityClaim) params.set("claim", "1")
  if (opts.next) params.set("next", opts.next)
  return `/auth/finish?${params.toString()}`
}

/** After a verified IdP assertion, reuse NameID/sub then issue a Supabase session. */
export async function magicLinkForIobmUser(opts: {
  email: string
  fullName?: string
  origin: string
  portal: string
  staffRole?: string
  identityClaim?: boolean
  subject?: string
  provider?: SsoProvider
}) {
  if (!isIobmPortal(opts.portal) || opts.portal === "employer") {
    throw new Error("Campus SSO is for students, alumni, and faculty/staff.")
  }
  const email = opts.email.trim().toLowerCase()
  const provider = opts.provider || "iobm_saml"
  const resolved = await resolveSsoSubject({
    provider,
    subject: (opts.subject || email).trim(),
    email,
    fullName: opts.fullName,
  })
  if (!resolved.ok) throw new Error(resolved.message)

  const admin = createAdminClient()
  const metadata = {
    full_name: opts.fullName || "",
    sso: "iobm",
    role: opts.portal === "faculty" ? "university" : "student",
    university: "Institute of Business Management (IoBM), Karachi",
    staff_role: opts.staffRole || "",
    alumni: opts.portal === "alumni",
    sso_subject: opts.subject || resolved.userId,
  }
  await admin.auth.admin.updateUserById(resolved.userId, {
    user_metadata: metadata,
    app_metadata: { sso: "iobm", sso_provider: provider, sso_subject: opts.subject || resolved.userId },
  })

  const finish = iobmFinishPath({
    portal: opts.portal,
    staffRole: opts.staffRole,
    identityClaim: opts.identityClaim,
  })
  const link = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: resolved.email,
    options: { data: metadata, redirectTo: `${opts.origin}${finish}` },
  })
  if (link.error || !link.data.properties?.hashed_token) {
    throw new Error(link.error?.message || "Could not open an IoBM session.")
  }
  const confirm = new URL("/auth/confirm", opts.origin)
  confirm.searchParams.set("token_hash", link.data.properties.hashed_token)
  confirm.searchParams.set("type", "email")
  confirm.searchParams.set("next", finish)
  return confirm.toString()
}
