import { createAdminClient } from "@/lib/supabase/admin"
import { isIobmPortal, type IobmPortal } from "@/lib/sso/iobm"

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

/** After a verified IdP assertion, issue a Supabase session via magic link. */
export async function magicLinkForIobmUser(opts: {
  email: string
  fullName?: string
  origin: string
  portal: string
  staffRole?: string
  identityClaim?: boolean
}) {
  if (!isIobmPortal(opts.portal) || opts.portal === "employer") {
    throw new Error("Campus SSO is for students, alumni, and faculty/staff.")
  }
  const admin = createAdminClient()
  const email = opts.email.trim().toLowerCase()
  const metadata = {
    full_name: opts.fullName || "",
    sso: "iobm",
    role: opts.portal === "faculty" ? "university" : "student",
    university: "Institute of Business Management (IoBM), Karachi",
    staff_role: opts.staffRole || "",
    alumni: opts.portal === "alumni",
  }
  const created = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: metadata,
  })
  if (created.error && !/already|registered|exists/i.test(created.error.message)) {
    throw new Error(created.error.message)
  }
  const redirectTo = `${opts.origin}${iobmFinishPath({
    portal: opts.portal,
    staffRole: opts.staffRole,
    identityClaim: opts.identityClaim,
  })}`
  const link = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { data: metadata, redirectTo },
  })
  if (link.error || !link.data.properties?.hashed_token) {
    throw new Error(link.error?.message || "Could not open an IoBM session.")
  }
  const confirm = new URL("/auth/confirm", opts.origin)
  confirm.searchParams.set("token_hash", link.data.properties.hashed_token)
  confirm.searchParams.set("type", "email")
  confirm.searchParams.set("next", iobmFinishPath({
    portal: opts.portal,
    staffRole: opts.staffRole,
    identityClaim: opts.identityClaim,
  }))
  return confirm.toString()
}
