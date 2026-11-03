import { createAdminClient } from "@/lib/supabase/admin"
import { IOBM_UNIVERSITY_NAME, iobmAppRole, staffRoleOf, type IobmPortal } from "@/lib/sso/iobm"

export type SsoProvider = "iobm_saml" | "iobm_oidc" | "google"
export type SsoStatus = "active" | "inactive" | "deprovisioned"
export type SsoAffiliation = "student" | "alumni" | "faculty"

export type SsoIdentityRow = {
  id: string
  user_id: string
  provider: string
  subject: string
  email: string | null
  status: SsoStatus
  affiliation: SsoAffiliation | null
  university: string | null
}

export type RoleConflictRow = {
  id: string
  user_id: string
  email: string | null
  existing_role: string | null
  requested_portal: string | null
  requested_role: string | null
  subject: string | null
  provider: string | null
  status: string
  created_at?: string
}

function missingTable(message: string | undefined) {
  return Boolean(message && /does not exist|could not find the table|schema cache/i.test(message))
}

function admin() {
  return createAdminClient()
}

export function googleSubjectOf(user: {
  id: string
  identities?: Array<{
    provider?: string
    identity_id?: string
    id?: string
    identity_data?: Record<string, unknown>
  }> | null
  user_metadata?: Record<string, unknown> | null
}) {
  const google = user.identities?.find((row) => row.provider === "google")
  const fromData = google?.identity_data?.sub
  if (typeof fromData === "string" && fromData) return fromData
  if (google?.identity_id) return google.identity_id
  if (google?.id) return google.id
  const meta = user.user_metadata?.sso_subject
  if (typeof meta === "string" && meta) return meta
  return user.id
}

export function affiliationOf(portal: IobmPortal): SsoAffiliation {
  if (portal === "faculty") return "faculty"
  if (portal === "alumni") return "alumni"
  return "student"
}

export async function findIdentityBySubject(provider: string, subject: string) {
  if (!subject) return null
  const { data, error } = await admin()
    .from("sso_identities")
    .select("id, user_id, provider, subject, email, status, affiliation, university")
    .eq("provider", provider)
    .eq("subject", subject)
    .maybeSingle()
  if (error) {
    if (missingTable(error.message)) return null
    throw new Error(error.message)
  }
  return data as SsoIdentityRow | null
}

export async function findIdentityByEmail(provider: string, email: string) {
  const { data, error } = await admin()
    .from("sso_identities")
    .select("id, user_id, provider, subject, email, status, affiliation, university")
    .eq("provider", provider)
    .ilike("email", email)
    .limit(2)
  if (error) {
    if (missingTable(error.message)) return []
    throw new Error(error.message)
  }
  return (data || []) as SsoIdentityRow[]
}

export async function findAuthUserByEmail(email: string) {
  const client = admin()
  const { data, error } = await client.auth.admin.listUsers({ page: 1, perPage: 200 })
  if (error) throw new Error(error.message)
  const match = (data.users || []).find((row) => row.email?.toLowerCase() === email)
  if (match) return match
  if ((data.users || []).length < 200) return null
  for (let page = 2; page <= 8; page += 1) {
    const next = await client.auth.admin.listUsers({ page, perPage: 200 })
    const found = (next.data.users || []).find((row) => row.email?.toLowerCase() === email)
    if (found) return found
    if ((next.data.users || []).length < 200) break
  }
  return null
}

export async function upsertSsoIdentity(row: {
  userId: string
  provider: string
  subject: string
  email: string
  affiliation?: SsoAffiliation
  status?: SsoStatus
}) {
  if (!row.subject) return { ok: false as const, missingTable: false }
  const payload = {
    user_id: row.userId,
    provider: row.provider,
    subject: row.subject,
    email: row.email.toLowerCase(),
    affiliation: row.affiliation || null,
    status: row.status || "active",
    university: IOBM_UNIVERSITY_NAME,
    last_login_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  const { error } = await admin().from("sso_identities").upsert(payload, { onConflict: "provider,subject" })
  if (error) {
    if (missingTable(error.message)) return { ok: false as const, missingTable: true }
    return { ok: false as const, missingTable: false, message: error.message }
  }
  await admin().auth.admin.updateUserById(row.userId, {
    app_metadata: { sso: "iobm", sso_provider: row.provider, sso_subject: row.subject, sso_status: payload.status },
    user_metadata: { sso: "iobm", sso_subject: row.subject, university: IOBM_UNIVERSITY_NAME },
  })
  return { ok: true as const, missingTable: false }
}

export async function setSsoStatus(userId: string, status: SsoStatus) {
  const client = admin()
  const { error } = await client
    .from("sso_identities")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
  if (error && !missingTable(error.message)) throw new Error(error.message)
  await client.from("user_moderation").upsert({
    user_id: userId,
    status: status === "active" ? "active" : "suspended",
    updated_at: new Date().toISOString(),
  })
  try {
    await client.auth.admin.updateUserById(userId, {
      ban_duration: status === "active" ? "none" : "876000h",
      app_metadata: { sso_status: status },
    })
  } catch {
    await client.auth.admin.updateUserById(userId, { app_metadata: { sso_status: status } })
  }
}

export async function recordRoleConflict(input: {
  userId: string
  email: string
  existingRole: string
  portal: IobmPortal
  subject?: string
  provider?: string
}) {
  const payload = {
    user_id: input.userId,
    email: input.email.toLowerCase(),
    existing_role: input.existingRole,
    requested_portal: input.portal,
    requested_role: iobmAppRole(input.portal),
    subject: input.subject || null,
    provider: input.provider || null,
    status: "open",
  }
  const { data, error } = await admin().from("sso_role_conflicts").insert(payload).select("id").maybeSingle()
  if (error) {
    if (missingTable(error.message)) return null
    throw new Error(error.message)
  }
  return data?.id as string | undefined
}

export async function listOpenConflicts() {
  const { data, error } = await admin()
    .from("sso_role_conflicts")
    .select("id, user_id, email, existing_role, requested_portal, requested_role, subject, provider, status, created_at")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(50)
  if (error) {
    if (missingTable(error.message)) return { rows: [] as RoleConflictRow[], missingTable: true }
    throw new Error(error.message)
  }
  return { rows: (data || []) as RoleConflictRow[], missingTable: false }
}

export async function listCampusIdentities() {
  const { data, error } = await admin()
    .from("sso_identities")
    .select("id, user_id, provider, subject, email, status, affiliation, university, last_login_at")
    .eq("university", IOBM_UNIVERSITY_NAME)
    .order("updated_at", { ascending: false })
    .limit(200)
  if (error) {
    if (missingTable(error.message)) return { rows: [] as SsoIdentityRow[], missingTable: true }
    throw new Error(error.message)
  }
  return { rows: (data || []) as SsoIdentityRow[], missingTable: false }
}

async function writeCampusStaff(userId: string, staffRole: string) {
  const client = admin()
  const row = { user_id: userId, university: IOBM_UNIVERSITY_NAME, staff_role: staffRoleOf(staffRole) }
  const inserted = await client.from("campus_staff").insert(row)
  if (!inserted.error) return
  const duplicate = inserted.error.code === "23505" || /duplicate|unique/i.test(inserted.error.message)
  if (!duplicate) throw new Error(inserted.error.message)
  const updated = await client.from("campus_staff").update({ university: row.university, staff_role: row.staff_role }).eq("user_id", userId)
  if (updated.error) throw new Error(updated.error.message)
}

export async function applyCampusPortal(input: {
  userId: string
  portal: IobmPortal
  staffRole?: string | null
  fullName?: string | null
}) {
  const client = admin()
  const fullName = input.fullName?.trim()
  if (input.portal === "faculty") {
    const roleWrite = await client.from("profiles").upsert(
      { id: input.userId, role: "university", ...(fullName ? { full_name: fullName } : {}) },
      { onConflict: "id" }
    )
    if (roleWrite.error) throw new Error(roleWrite.error.message)
    await writeCampusStaff(input.userId, input.staffRole || "advisor")
    await client.auth.admin.updateUserById(input.userId, {
      user_metadata: {
        role: "university",
        university: IOBM_UNIVERSITY_NAME,
        staff_role: staffRoleOf(input.staffRole),
        sso: "iobm",
        ...(fullName ? { full_name: fullName } : {}),
      },
    })
    return "university" as const
  }

  await client.from("campus_staff").delete().eq("user_id", input.userId)
  const roleWrite = await client.from("profiles").upsert(
    { id: input.userId, role: "student", ...(fullName ? { full_name: fullName } : {}) },
    { onConflict: "id" }
  )
  if (roleWrite.error) throw new Error(roleWrite.error.message)
  const studentRow: Record<string, unknown> = {
    id: input.userId,
    university: IOBM_UNIVERSITY_NAME,
    is_alumni: input.portal === "alumni",
  }
  const studentWrite = await client.from("student_profiles").upsert(studentRow, { onConflict: "id" })
  if (studentWrite.error && /is_alumni/i.test(studentWrite.error.message)) {
    delete studentRow.is_alumni
    const retry = await client.from("student_profiles").upsert(studentRow, { onConflict: "id" })
    if (retry.error) throw new Error(retry.error.message)
  } else if (studentWrite.error) {
    throw new Error(studentWrite.error.message)
  }
  await client.auth.admin.updateUserById(input.userId, {
    user_metadata: {
      role: "student",
      university: IOBM_UNIVERSITY_NAME,
      sso: "iobm",
      alumni: input.portal === "alumni",
      ...(fullName ? { full_name: fullName } : {}),
    },
  })
  return "student" as const
}

export async function resolveSsoSubject(input: {
  provider: SsoProvider
  subject: string
  email: string
  fullName?: string
}) {
  const email = input.email.trim().toLowerCase()
  const subject = input.subject.trim()
  const bySubject = subject ? await findIdentityBySubject(input.provider, subject) : null
  if (bySubject) {
    if (bySubject.status === "deprovisioned") {
      return { ok: false as const, message: "This campus account has been deprovisioned. Ask the Career Development Center to restore it." }
    }
    if (bySubject.email && bySubject.email.toLowerCase() !== email) {
      const taken = await findAuthUserByEmail(email)
      if (taken && taken.id !== bySubject.user_id) {
        const conflictId = await recordRoleConflict({
          userId: bySubject.user_id,
          email,
          existingRole: "identity",
          portal: "student",
          subject,
          provider: input.provider,
        })
        return {
          ok: false as const,
          message: `This IoBM identity is already linked to another account. The career office can merge them under Campus → SSO${conflictId ? ` (case ${conflictId.slice(0, 8)})` : ""}.`,
        }
      }
      const updated = await admin().auth.admin.updateUserById(bySubject.user_id, { email, email_confirm: true })
      if (updated.error && !/already|registered|exists/i.test(updated.error.message)) {
        return { ok: false as const, message: updated.error.message }
      }
    }
    await upsertSsoIdentity({
      userId: bySubject.user_id,
      provider: input.provider,
      subject,
      email,
      affiliation: bySubject.affiliation || undefined,
      status: "active",
    })
    return { ok: true as const, userId: bySubject.user_id, email, reused: true }
  }

  const existing = await findAuthUserByEmail(email)
  if (existing) {
    const other = await findIdentityBySubject(input.provider, subject)
    if (other && other.user_id !== existing.id) {
      const conflictId = await recordRoleConflict({
        userId: existing.id,
        email,
        existingRole: "identity",
        portal: "student",
        subject,
        provider: input.provider,
      })
      return {
        ok: false as const,
        message: `This email is linked to a different IoBM identity. The career office can merge accounts under Campus → SSO${conflictId ? ` (case ${conflictId.slice(0, 8)})` : ""}.`,
      }
    }
    await upsertSsoIdentity({
      userId: existing.id,
      provider: input.provider,
      subject: subject || existing.id,
      email,
    })
    return { ok: true as const, userId: existing.id, email, reused: true }
  }

  const created = await admin().auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: input.fullName || "", sso: "iobm", sso_subject: subject },
    app_metadata: { sso: "iobm", sso_provider: input.provider, sso_subject: subject, sso_status: "active" },
  })
  if (created.error && !/already|registered|exists/i.test(created.error.message)) {
    return { ok: false as const, message: created.error.message }
  }
  const userId = created.data.user?.id || (await findAuthUserByEmail(email))?.id
  if (!userId) return { ok: false as const, message: "Could not open an IoBM account." }
  await upsertSsoIdentity({
    userId,
    provider: input.provider,
    subject: subject || userId,
    email,
  })
  return { ok: true as const, userId, email, reused: Boolean(created.error) }
}

export async function overrideSsoRole(input: {
  userId: string
  portal: IobmPortal
  staffRole?: string
  actorId: string
  conflictId?: string
  note?: string
}) {
  const role = await applyCampusPortal({
    userId: input.userId,
    portal: input.portal,
    staffRole: input.staffRole,
  })
  if (input.conflictId) {
    await admin()
      .from("sso_role_conflicts")
      .update({
        status: "overridden",
        resolved_by: input.actorId,
        resolved_at: new Date().toISOString(),
        note: input.note || `Forced ${input.portal}`,
      })
      .eq("id", input.conflictId)
  }
  return role
}

export async function mergeSsoAccounts(input: {
  keepUserId: string
  absorbUserId: string
  actorId: string
  conflictId?: string
  portal?: IobmPortal
  staffRole?: string
}) {
  if (input.keepUserId === input.absorbUserId) throw new Error("Pick two different accounts.")
  const client = admin()
  const { data: identities } = await client.from("sso_identities").select("id").eq("user_id", input.absorbUserId)
  if (identities?.length) {
    const moved = await client
      .from("sso_identities")
      .update({ user_id: input.keepUserId, updated_at: new Date().toISOString() })
      .eq("user_id", input.absorbUserId)
    if (moved.error && !missingTable(moved.error.message)) throw new Error(moved.error.message)
  }
  const absorb = await client.auth.admin.getUserById(input.absorbUserId)
  const keep = await client.auth.admin.getUserById(input.keepUserId)
  const absorbEmail = absorb.data.user?.email
  if (absorbEmail && keep.data.user?.email && absorbEmail.toLowerCase() !== keep.data.user.email.toLowerCase()) {
    const taken = await findAuthUserByEmail(absorbEmail)
    if (!taken || taken.id === input.keepUserId || taken.id === input.absorbUserId) {
      await client.auth.admin.updateUserById(input.keepUserId, { email: absorbEmail, email_confirm: true })
    }
  }
  if (input.portal) {
    await applyCampusPortal({ userId: input.keepUserId, portal: input.portal, staffRole: input.staffRole })
  }
  await client.from("user_moderation").upsert({
    user_id: input.absorbUserId,
    status: "banned",
    updated_at: new Date().toISOString(),
    updated_by: input.actorId,
  })
  await client.auth.admin.updateUserById(input.absorbUserId, {
    ban_duration: "876000h",
    app_metadata: { sso_status: "deprovisioned", merged_into: input.keepUserId },
  })
  if (input.conflictId) {
    await client
      .from("sso_role_conflicts")
      .update({
        status: "merged",
        keep_user_id: input.keepUserId,
        absorb_user_id: input.absorbUserId,
        resolved_by: input.actorId,
        resolved_at: new Date().toISOString(),
        note: "Merged duplicate SSO accounts",
      })
      .eq("id", input.conflictId)
  }
}

export async function syncRoster(entries: Array<{
  email?: string
  subject?: string
  affiliation?: SsoAffiliation | "departed"
  active?: boolean
}>, opts?: { strict?: boolean }) {
  const client = admin()
  const seen = new Set<string>()
  let updated = 0
  let deprovisioned = 0
  let restored = 0

  for (const entry of entries) {
    const email = entry.email?.trim().toLowerCase()
    const subject = entry.subject?.trim()
    if (!email && !subject) continue
    const departed = entry.affiliation === "departed" || entry.active === false
    let identity = subject ? await findIdentityBySubject("iobm_saml", subject) : null
    if (!identity && subject) identity = await findIdentityBySubject("iobm_oidc", subject)
    if (!identity && subject) identity = await findIdentityBySubject("google", subject)
    if (!identity && email) {
      const rows = [
        ...(await findIdentityByEmail("iobm_saml", email)),
        ...(await findIdentityByEmail("iobm_oidc", email)),
        ...(await findIdentityByEmail("google", email)),
      ]
      identity = rows[0] || null
    }
    if (!identity && email && !departed) {
      const resolved = await resolveSsoSubject({
        provider: "iobm_saml",
        subject: subject || email,
        email,
      })
      if (resolved.ok) {
        const affiliation = entry.affiliation === "alumni" || entry.affiliation === "faculty" ? entry.affiliation : "student"
        await applyCampusPortal({
          userId: resolved.userId,
          portal: affiliation === "faculty" ? "faculty" : affiliation === "alumni" ? "alumni" : "student",
        })
        seen.add(resolved.userId)
        updated += 1
      }
      continue
    }
    if (!identity) continue
    seen.add(identity.user_id)
    if (departed) {
      await setSsoStatus(identity.user_id, "deprovisioned")
      deprovisioned += 1
      continue
    }
    const affiliation = entry.affiliation === "alumni" || entry.affiliation === "faculty" ? entry.affiliation : "student"
    if (identity.status !== "active") {
      await setSsoStatus(identity.user_id, "active")
      restored += 1
    }
    await applyCampusPortal({
      userId: identity.user_id,
      portal: affiliation === "faculty" ? "faculty" : affiliation === "alumni" ? "alumni" : "student",
    })
    await upsertSsoIdentity({
      userId: identity.user_id,
      provider: identity.provider,
      subject: identity.subject,
      email: email || identity.email || "",
      affiliation,
      status: "active",
    })
    updated += 1
  }

  if (opts?.strict) {
    const listed = await listCampusIdentities()
    for (const row of listed.rows) {
      if (row.status === "deprovisioned") continue
      if (seen.has(row.user_id)) continue
      await setSsoStatus(row.user_id, "deprovisioned")
      deprovisioned += 1
    }
  }

  void client
  return { updated, deprovisioned, restored }
}
