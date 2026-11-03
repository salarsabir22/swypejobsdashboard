"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import {
  affiliationOf,
  applyCampusPortal,
  findIdentityBySubject,
  googleSubjectOf,
  recordRoleConflict,
  upsertSsoIdentity,
  type SsoProvider,
} from "@/lib/sso/identity"
import {
  campusSsoRequiresIobmEmail,
  iobmAppRole,
  isIobmCampusEmail,
  isIobmPortal,
  type IobmPortal,
} from "@/lib/sso/iobm"

async function studentHasProgress(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: { from: (table: string) => any },
  userId: string
) {
  const { data } = await client
    .from("student_profiles")
    .select("degree, graduation_year, skills")
    .eq("id", userId)
    .maybeSingle()
  const skills = (data?.skills as string[] | null) || []
  return Boolean(data?.degree || data?.graduation_year || skills.length > 0)
}

async function identityStatus(userId: string, provider: string, subject: string) {
  const bySubject = await findIdentityBySubject(provider, subject)
  if (bySubject?.status === "deprovisioned") return bySubject
  const { data, error } = await createAdminClient()
    .from("sso_identities")
    .select("id, user_id, provider, subject, email, status, affiliation, university")
    .eq("user_id", userId)
    .eq("status", "deprovisioned")
    .limit(1)
    .maybeSingle()
  if (error) return null
  return data
}

/** Attach the signed-in user to the IoBM tenant for the chosen campus portal. */
export async function provisionIobmSsoAccount(input: {
  portal: string
  staffRole?: string | null
  identityClaim?: boolean
  fullName?: string | null
  subject?: string | null
  provider?: SsoProvider | null
}): Promise<{ ok: true; role: "student" | "university" } | { ok: false; message: string }> {
  if (!isIobmPortal(input.portal) || input.portal === "employer") {
    return { ok: false, message: "Choose a campus login: student, alumni, or faculty/staff." }
  }
  const portal: IobmPortal = input.portal
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) return { ok: false, message: "Sign in first." }

  if (campusSsoRequiresIobmEmail(portal, input.identityClaim) && !isIobmCampusEmail(user.email)) {
    return { ok: false, message: "Use your IoBM campus email (iobm.edu.pk) for this login." }
  }

  const provider: SsoProvider = input.provider || "google"
  const subject = (input.subject || googleSubjectOf(user)).trim()
  const bound = await findIdentityBySubject(provider, subject)
  if (bound && bound.user_id !== user.id) {
    const conflictId = await recordRoleConflict({
      userId: bound.user_id,
      email: user.email,
      existingRole: "identity",
      portal,
      subject,
      provider,
    })
    return {
      ok: false,
      message: `This IoBM identity already belongs to another account. The career office can merge them under Campus → SSO${conflictId ? ` (case ${conflictId.slice(0, 8)})` : ""}.`,
    }
  }

  const deprovisioned = await identityStatus(user.id, provider, subject)
  if (deprovisioned) {
    return { ok: false, message: "This campus account has been deprovisioned. Ask the Career Development Center to restore it." }
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
  const existing = profile?.role
  const knownIdentity = Boolean(bound && bound.user_id === user.id)
  const requested = iobmAppRole(portal)

  if (existing === "admin") return { ok: false, message: "This email is a platform admin account." }

  const conflicting =
    (existing === "recruiter" && requested !== "recruiter") ||
    (existing === "university" && requested === "student") ||
    (portal === "faculty" && existing === "student" && (await studentHasProgress(supabase, user.id)))

  if (conflicting && !knownIdentity) {
    const conflictId = await recordRoleConflict({
      userId: user.id,
      email: user.email,
      existingRole: existing || "unknown",
      portal,
      subject,
      provider,
    })
    const hint = conflictId ? ` (case ${conflictId.slice(0, 8)})` : ""
    if (existing === "recruiter") {
      return { ok: false, message: `This email is already an employer account. The career office can merge or override it under Campus → SSO${hint}.` }
    }
    if (existing === "university") {
      return { ok: false, message: `This email is a career-office account. Use Faculty/Staff login, or ask the CDC to override under Campus → SSO${hint}.` }
    }
    return { ok: false, message: `This email is already a student account. Use Student login, or ask the CDC to override under Campus → SSO${hint}.` }
  }

  const fullName =
    input.fullName?.trim() ||
    (typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null) ||
    (typeof user.user_metadata?.name === "string" ? user.user_metadata.name : null)

  try {
    const role = await applyCampusPortal({
      userId: user.id,
      portal,
      staffRole: input.staffRole,
      fullName,
    })
    await upsertSsoIdentity({
      userId: user.id,
      provider,
      subject: subject || user.id,
      email: user.email,
      affiliation: affiliationOf(portal),
      status: "active",
    })
    return { ok: true, role }
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Could not finish IoBM sign-in." }
  }
}
