import { redirect } from "next/navigation"
import { getRequestUser } from "@/lib/nav/app-shell-user"
import { RecruiterDashboardView } from "./recruiter-dashboard-view"
import { StudentDashboardView } from "./student-dashboard-view"

/**
 * Layout already enforces auth + onboarding via loadAppShellUser.
 * Reuse the cached user so this page does not pay another getUser() hop.
 */
export default async function DashboardPage() {
  const { supabase, user } = await getRequestUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .maybeSingle()

  if (!profile) redirect("/onboarding")
  if (profile.role === "student") {
    return <StudentDashboardView userId={user.id} fullName={profile.full_name} />
  }
  if (profile.role === "recruiter") {
    return <RecruiterDashboardView userId={user.id} fullName={profile.full_name} />
  }
  if (profile.role === "university") redirect("/campus")
  if (profile.role === "admin") redirect("/admin")
  redirect("/discover")
}
