import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { readStudentCampusMembership } from "@/lib/campus/student-campus"
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

  const membership = await readStudentCampusMembership(supabase, user)
  let studentRes = await supabase
    .from("student_profiles")
    .select("skills, preferred_job_categories, still_enrolled, current_semester, degree, graduation_year, cgpa, is_alumni, gender, department, preferred_locations, university")
    .eq("id", user.id)
    .maybeSingle()
  if (studentRes.error) {
    // cgpa / is_alumni columns may not exist until the migrations run.
    studentRes = await supabase
      .from("student_profiles")
      .select("skills, preferred_job_categories, still_enrolled, current_semester, degree, graduation_year, university")
      .eq("id", user.id)
      .maybeSingle()
  }
  const student = studentRes.data as {
    skills?: string[] | null
    preferred_job_categories?: string[] | null
    still_enrolled?: boolean | null
    current_semester?: number | null
    degree?: string | null
    graduation_year?: number | null
    cgpa?: number | null
    is_alumni?: boolean | null
    gender?: string | null
    department?: string | null
    preferred_locations?: string[] | null
    university?: string | null
  } | null

  return (
    <StudentDiscoverView
      userId={user.id}
      skills={student?.skills ?? []}
      preferredCategories={student?.preferred_job_categories ?? []}
      stillEnrolled={student?.still_enrolled ?? null}
      currentSemester={student?.current_semester ?? null}
      degree={student?.degree ?? null}
      graduationYear={student?.graduation_year ?? null}
      cgpa={student?.cgpa ?? null}
      isAlumni={student?.is_alumni ?? membership.isAlumni}
      gender={student?.gender ?? null}
      department={student?.department ?? null}
      preferredLocations={student?.preferred_locations ?? []}
      university={membership.university || student?.university || null}
      campusConnected={membership.campusConnected !== false}
      selfImageUrl={profile.avatar_url}
      selfName={profile.full_name || "You"}
    />
  )
}
