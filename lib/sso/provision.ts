"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import {
  IOBM_UNIVERSITY_NAME,
  campusSsoRequiresIobmEmail,
  iobmAppRole,
  isIobmCampusEmail,
  isIobmPortal,
  staffRoleOf,
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

async function writeCampusStaff(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: { from: (table: string) => any },
  row: { user_id: string; university: string; staff_role: string }
) {
  const inserted = await client.from("campus_staff").insert(row)
  if (!inserted.error) return null
  const duplicate = inserted.error.code === "23505" || /duplicate|unique/i.test(inserted.error.message)
  if (!duplicate) return inserted.error.message
  const updated = await client
    .from("campus_staff")
    .update({ university: row.university, staff_role: row.staff_role })
    .eq("user_id", row.user_id)
  if (!updated.error) return null
  if (/invalid|check|enum|staff_role/i.test(updated.error.message)) {
    const fallback = await client
      .from("campus_staff")
      .update({ university: row.university, staff_role: "advisor" })
      .eq("user_id", row.user_id)
    return fallback.error?.message || null
  }
  return updated.error.message
}

/** Attach the signed-in user to the IoBM tenant for the chosen campus portal. */
export async function provisionIobmSsoAccount(input: {
  portal: string
  staffRole?: string | null
  identityClaim?: boolean
  fullName?: string | null
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
    return {
      ok: false,
      message: "Use your IoBM campus email (iobm.edu.pk) for this login.",
    }
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
  const existing = profile?.role
  if (existing === "admin") return { ok: false, message: "This email is a platform admin account." }
  if (existing === "recruiter") {
    return { ok: false, message: "This email is already an employer account. Use Employer login." }
  }

  const fullName =
    input.fullName?.trim() ||
    (typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name : null) ||
    (typeof user.user_metadata?.name === "string" ? user.user_metadata.name : null)

  if (portal === "faculty") {
    if (existing === "student" && (await studentHasProgress(supabase, user.id))) {
      return { ok: false, message: "This email is already a student account. Use Student login." }
    }
    const staffRole = staffRoleOf(input.staffRole)
    const roleWrite = await supabase.from("profiles").update({
      role: "university",
      ...(fullName ? { full_name: fullName } : {}),
    }).eq("id", user.id)
    let roleOk = !roleWrite.error
    if (!roleOk) {
      try {
        const admin = createAdminClient()
        const adminRole = await admin.from("profiles").update({
          role: "university",
          ...(fullName ? { full_name: fullName } : {}),
        }).eq("id", user.id)
        if (adminRole.error) return { ok: false, message: adminRole.error.message }
        roleOk = true
      } catch (err) {
        return { ok: false, message: err instanceof Error ? err.message : "Could not open the career office." }
      }
    }
    const row = { user_id: user.id, university: IOBM_UNIVERSITY_NAME, staff_role: staffRole }
    let staffError = await writeCampusStaff(supabase, row)
    if (staffError) {
      try {
        const admin = createAdminClient()
        staffError = await writeCampusStaff(admin, row)
      } catch (err) {
        return { ok: false, message: staffError || (err instanceof Error ? err.message : "Could not save staff role.") }
      }
    }
    if (staffError) return { ok: false, message: staffError }
    await supabase.auth.updateUser({
      data: {
        role: "university",
        university: IOBM_UNIVERSITY_NAME,
        staff_role: staffRole,
        sso: "iobm",
        ...(fullName ? { full_name: fullName } : {}),
      },
    })
    return { ok: true, role: "university" }
  }

  if (existing === "university") {
    return { ok: false, message: "This email is a career-office account. Use Faculty/Staff login." }
  }

  const appRole = iobmAppRole(portal)
  await supabase.from("profiles").upsert(
    { id: user.id, role: appRole, ...(fullName ? { full_name: fullName } : {}) },
    { onConflict: "id" }
  )
  const studentRow: Record<string, unknown> = {
    id: user.id,
    university: IOBM_UNIVERSITY_NAME,
    is_alumni: portal === "alumni",
  }
  const studentWrite = await supabase.from("student_profiles").upsert(studentRow, { onConflict: "id" })
  if (studentWrite.error && /is_alumni/i.test(studentWrite.error.message)) {
    delete studentRow.is_alumni
    await supabase.from("student_profiles").upsert(studentRow, { onConflict: "id" })
  }
  await supabase.auth.updateUser({
    data: {
      role: "student",
      university: IOBM_UNIVERSITY_NAME,
      sso: "iobm",
      alumni: portal === "alumni",
      ...(fullName ? { full_name: fullName } : {}),
    },
  })
  return { ok: true, role: "student" }
}
