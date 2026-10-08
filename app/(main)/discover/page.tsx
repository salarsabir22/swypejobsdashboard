import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { StudentDiscoverView } from "./StudentDiscoverView"
import { RecruiterDiscoverView } from "./RecruiterDiscoverView"

export default async function DiscoverPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, avatar_url")
    .eq("id", user.id)
    .single()

  if (!profile) redirect("/onboarding")

  if (profile.role === "recruiter") {
    const { data: company } = await supabase
      .from("recruiter_profiles")
      .select("logo_url, company_name, calendly_url")
      .eq("id", user.id)
      .maybeSingle()
    return (
      <RecruiterDiscoverView
        userId={user.id}
        selfImageUrl={company?.logo_url || profile.avatar_url}
        selfName={company?.company_name || profile.full_name || "You"}
        recruiterName={profile.full_name || "A recruiter"}
        companyName={company?.company_name || "their company"}
        calendlyUrl={company?.calendly_url}
      />
    )
  }

  const { data: student } = await supabase
    .from("student_profiles")
    .select("skills, preferred_job_categories, still_enrolled, current_semester")
    .eq("id", user.id)
    .maybeSingle()

  return (
    <StudentDiscoverView
      userId={user.id}
      skills={student?.skills ?? []}
      preferredCategories={student?.preferred_job_categories ?? []}
      stillEnrolled={student?.still_enrolled ?? null}
      currentSemester={student?.current_semester ?? null}
      selfImageUrl={profile.avatar_url}
      selfName={profile.full_name || "You"}
    />
  )
}
