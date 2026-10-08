import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { RecruiterDashboardView } from "./recruiter-dashboard-view"
import { StudentDashboardView } from "./student-dashboard-view"
import { isStudentOnboardingComplete, isRecruiterOnboardingComplete, STUDENT_ONBOARDING_SELECT, RECRUITER_ONBOARDING_SELECT } from "@/lib/profile/completeness"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .single()

  if (!profile) redirect("/onboarding")
  if (profile.role === "student") {
    const { data: student } = await supabase
      .from("student_profiles")
      .select(STUDENT_ONBOARDING_SELECT)
      .eq("id", user.id)
      .maybeSingle()
    if (!isStudentOnboardingComplete(student)) redirect("/onboarding")
    return <StudentDashboardView userId={user.id} fullName={profile.full_name} />
  }
  if (profile.role === "recruiter") {
    const { data: recruiter } = await supabase
      .from("recruiter_profiles")
      .select(RECRUITER_ONBOARDING_SELECT)
      .eq("id", user.id)
      .maybeSingle()
    if (!isRecruiterOnboardingComplete(recruiter)) redirect("/onboarding")
    return <RecruiterDashboardView userId={user.id} fullName={profile.full_name} />
  }
  if (profile.role === "university") redirect("/campus")
  redirect("/admin")
}
