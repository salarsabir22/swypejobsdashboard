import { cache } from "react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import type { UserRole } from "@/types"
import {
  isRecruiterOnboardingComplete,
  isStudentOnboardingComplete,
  RECRUITER_ONBOARDING_SELECT,
  STUDENT_ONBOARDING_SELECT,
} from "@/lib/profile/completeness"
import { normalizeModules, type AdminStaffRole } from "@/lib/admin/modules"

export type AppShellUser = {
  userId: string | null
  email: string | null
  role: UserRole | "admin"
  fullName: string | null
  avatarUrl: string | null
  shareTitle: string | null
  /** RBAC modules when role is admin */
  adminModules?: string[]
}

/** One auth + profile round-trip per request (shared across layout/pages). */
export const getRequestUser = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, user }
})

export async function loadAppShellUser(opts?: { requireOnboarding?: boolean }): Promise<AppShellUser> {
  const { supabase, user } = await getRequestUser()

  const empty: AppShellUser = {
    userId: null,
    email: null,
    role: "student",
    fullName: null,
    avatarUrl: null,
    shareTitle: null,
    adminModules: undefined,
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

  if (role === "recruiter") {
    const { data: company } = await supabase
      .from("recruiter_profiles")
      .select(RECRUITER_ONBOARDING_SELECT)
      .eq("id", user.id)
      .maybeSingle()
    if (company?.company_name) shareTitle = company.company_name
    if (opts?.requireOnboarding && !isRecruiterOnboardingComplete(company)) redirect("/onboarding")
  } else if (role === "student") {
    const { data: student } = await supabase
      .from("student_profiles")
      .select(STUDENT_ONBOARDING_SELECT)
      .eq("id", user.id)
      .maybeSingle()
    if (opts?.requireOnboarding && !isStudentOnboardingComplete(student)) redirect("/onboarding")
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
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    role,
    fullName: profile?.full_name ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    shareTitle,
    adminModules,
  }
}
