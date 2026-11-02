import { redirect } from "next/navigation"
import { loadAppShellUser } from "@/lib/nav/app-shell-user"
import { RecruiterDashboardView } from "./recruiter-dashboard-view"
import { StudentDashboardView } from "./student-dashboard-view"

/**
 * Layout already loaded this user (React cache). Do not fetch profiles again.
 */
export default async function DashboardPage() {
  const user = await loadAppShellUser(true)
  if (!user.userId) redirect("/login")

  if (user.role === "student") {
    return <StudentDashboardView userId={user.userId} fullName={user.fullName} />
  }
  if (user.role === "recruiter") {
    return <RecruiterDashboardView userId={user.userId} fullName={user.fullName} />
  }
  if (user.role === "university") redirect("/campus")
  if (user.role === "admin") redirect("/admin")
  redirect("/discover")
}
