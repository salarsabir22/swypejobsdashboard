import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import type { UserRole } from "@/types"
import {
  isRecruiterOnboardingComplete,
  isStudentOnboardingComplete,
  RECRUITER_ONBOARDING_SELECT,
  STUDENT_ONBOARDING_SELECT,
} from "@/lib/profile/completeness"

export type AppShellUser = {
  userId: string | null
  email: string | null
  role: UserRole | "admin"
  fullName: string | null
  avatarUrl: string | null
  shareTitle: string | null
}

export async function loadAppShellUser(opts?: { requireOnboarding?: boolean }): Promise<AppShellUser> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const empty: AppShellUser = {
    userId: null,
    email: null,
    role: "student",
    fullName: null,
    avatarUrl: null,
    shareTitle: null,
  }
  if (!user) return empty

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, avatar_url")
    .eq("id", user.id)
    .single()

  const role = (profile?.role as UserRole | "admin") || "student"
  let shareTitle = profile?.full_name ?? null

  if (role === "recruiter") {
    const { data: company } = await supabase
      .from("recruiter_profiles")
      .select(RECRUITER_ONBOARDING_SELECT)
      .eq("id", user.id)
      .maybeSingle()
    if (company?.company_name) shareTitle = company.company_name
    if (opts?.requireOnboarding && !isRecruiterOnboardingComplete(company)) redirect("/onboarding")
  }
  if (role === "student") {
    const { data: student } = await supabase
      .from("student_profiles")
      .select(STUDENT_ONBOARDING_SELECT)
      .eq("id", user.id)
      .maybeSingle()
    if (opts?.requireOnboarding && !isStudentOnboardingComplete(student)) redirect("/onboarding")
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    role,
    fullName: profile?.full_name ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    shareTitle,
  }
}
