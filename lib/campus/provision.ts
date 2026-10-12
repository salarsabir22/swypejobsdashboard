"use server"

import type { SupabaseClient } from "@supabase/supabase-js"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

const STAFF_ROLES = ["director", "advisor", "dean"] as const
type StaffRole = (typeof STAFF_ROLES)[number]

function staffRoleOf(value: string | null | undefined): StaffRole {
  return STAFF_ROLES.includes(value as StaffRole) ? (value as StaffRole) : "advisor"
}

async function writeStaff(
  client: SupabaseClient,
  row: { user_id: string; university: string; staff_role: StaffRole }
) {
  const inserted = await client.from("campus_staff").insert(row)
  if (!inserted.error) return null
  const duplicate = inserted.error.code === "23505" || /duplicate|unique/i.test(inserted.error.message)
  if (!duplicate) return inserted.error.message
  const updated = await client
    .from("campus_staff")
    .update({ university: row.university, staff_role: row.staff_role })
    .eq("user_id", row.user_id)
  return updated.error?.message || null
}

/** Marks the signed-in user as a career office and attaches them to one university. */
export async function provisionUniversityAccount(input: {
  university: string
  staffRole?: string
  fullName?: string
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const university = input.university.trim()
  if (university.length < 2 || university === "Other (type your own)") {
    return { ok: false, message: "Choose your university." }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, message: "Sign in first." }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
  if (profile?.role === "admin" || profile?.role === "recruiter") {
    return { ok: false, message: "This email is already registered as a different account type." }
  }
  if (profile?.role === "student" && user.user_metadata?.role !== "university") {
    return {
      ok: false,
      message: "This sign-in is for university career offices. Students and recruiters use the main sign-in.",
    }
  }
  if (profile?.role === "student") {
    const { data: student } = await supabase
      .from("student_profiles")
      .select("degree, graduation_year, skills")
      .eq("id", user.id)
      .maybeSingle()
    const skills = (student?.skills as string[] | null) || []
    if (student?.degree || student?.graduation_year || skills.length > 0) {
      return { ok: false, message: "This email is already a student account. Use a career-office email." }
    }
  }

  const fullName = input.fullName?.trim()
  if (fullName) {
    await supabase.from("profiles").update({ full_name: fullName }).eq("id", user.id)
  }

  const row = { user_id: user.id, university, staff_role: staffRoleOf(input.staffRole) }
  const roleWrite = await supabase.from("profiles").update({ role: "university" }).eq("id", user.id)
  const { data: after } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
  let roleOk = after?.role === "university"
  let staffError = await writeStaff(supabase, row)

  if (!roleOk || staffError) {
    try {
      const admin = createAdminClient()
      if (!roleOk) {
        const adminRole = await admin.from("profiles").update({ role: "university" }).eq("id", user.id)
        if (adminRole.error) return { ok: false, message: adminRole.error.message }
        if (fullName) await admin.from("profiles").update({ full_name: fullName }).eq("id", user.id)
        roleOk = true
      }
      if (staffError) {
        staffError = await writeStaff(admin, row)
        if (staffError) return { ok: false, message: staffError }
      }
    } catch (err) {
      return {
        ok: false,
        message:
          staffError ||
          roleWrite.error?.message ||
          (err instanceof Error ? err.message : "Could not open the career office."),
      }
    }
  }

  if (!roleOk) return { ok: false, message: "Could not save the career-office account." }
  return { ok: true }
}
