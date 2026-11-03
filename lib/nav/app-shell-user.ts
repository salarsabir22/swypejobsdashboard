import { cache } from "react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import type { UserRole } from "@/types"
import {
  isRecruiterOnboardingComplete,
  isStudentOnboardingComplete,
  RECRUITER_ONBOARDING_SELECT,
  STUDENT_ONBOARDING_SELECT,
  type StudentOnboardingFields,
} from "@/lib/profile/completeness"
import { normalizeModules, type AdminStaffRole } from "@/lib/admin/modules"
import { canonicalizeUniversity } from "@/lib/campus/student-campus"
import { IOBM_UNIVERSITY_NAME } from "@/lib/sso/iobm"

export type AppShellUser = {
  userId: string | null
  email: string | null
  role: UserRole | "admin"
  fullName: string | null
  avatarUrl: string | null
  shareTitle: string | null
  /** RBAC modules when role is admin */
  adminModules?: string[]
  isAlumni?: boolean
  university?: string | null
  staffRole?: string | null
}

/** One auth + profile round-trip per request (shared across layout/pages). */
export const getRequestUser = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, user }
})

/** Primitive arg so layout + page share one React cache entry per request. */
export const loadAppShellUser = cache(async (requireOnboarding = false): Promise<AppShellUser> => {
  const { supabase, user } = await getRequestUser()

  const empty: AppShellUser = {
    userId: null,
    email: null,
    role: "student",
    fullName: null,
    avatarUrl: null,
    shareTitle: null,
    adminModules: undefined,
    isAlumni: false,
    university: null,
    staffRole: null,
  }
  if (!user) return empty

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle()

  const role = (profile?.role as UserRole | "admin") || "student"
  let shareTitle = profile?.full_name ?? null
  let adminModules: string[] | undefined
  let isAlumni = false
  let university: string | null = null
  let staffRole: string | null = null

  if (role === "recruiter") {
    const { data: company } = await supabase
      .from("recruiter_profiles")
      .select(RECRUITER_ONBOARDING_SELECT)
      .eq("id", user.id)
      .maybeSingle()
    if (company?.company_name) shareTitle = company.company_name
    if (requireOnboarding && !isRecruiterOnboardingComplete(company)) redirect("/onboarding")
  } else if (role === "student") {
    const first = await supabase
      .from("student_profiles")
      .select(`${STUDENT_ONBOARDING_SELECT}, is_alumni`)
      .eq("id", user.id)
      .maybeSingle()
    let student = first.data as (StudentOnboardingFields & { is_alumni?: boolean | null }) | null
    if (first.error) {
      const retry = await supabase
        .from("student_profiles")
        .select(STUDENT_ONBOARDING_SELECT)
        .eq("id", user.id)
        .maybeSingle()
      student = retry.data as typeof student
    }
    if (requireOnboarding && !isStudentOnboardingComplete(student)) redirect("/onboarding")
    isAlumni = student?.is_alumni === true
    const metaUni = typeof user.user_metadata?.university === "string" ? user.user_metadata.university : ""
    university =
      canonicalizeUniversity(student?.university || metaUni) ||
      (user.user_metadata?.sso === "iobm" ? IOBM_UNIVERSITY_NAME : null)
  } else if (role === "admin") {
    const { data: staff, error: staffError } = await supabase
      .from("platform_staff")
      .select("staff_role, modules")
      .eq("user_id", user.id)
      .maybeSingle()
    const staffRole: AdminStaffRole = staffError
      ? "super_admin"
      : (staff?.staff_role as AdminStaffRole) || "moderator"
    adminModules = normalizeModules(staffError ? ["all"] : (staff?.modules as string[] | null), staffRole)
  } else if (role === "university") {
    const { data: campusStaff } = await supabase
      .from("campus_staff")
      .select("staff_role, university")
      .eq("user_id", user.id)
      .maybeSingle()
    staffRole = campusStaff?.staff_role || null
    university = campusStaff?.university || university
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    role,
    fullName: profile?.full_name ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    shareTitle,
    adminModules,
    isAlumni,
    university,
    staffRole,
  }
})
