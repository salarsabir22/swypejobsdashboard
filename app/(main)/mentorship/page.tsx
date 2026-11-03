import { redirect } from "next/navigation"
import { getRequestUser } from "@/lib/nav/app-shell-user"
import { readStudentCampusMembership } from "@/lib/campus/student-campus"
import { MentorshipStudentView, MentorshipAlumniView } from "@/components/portal/MentorshipViews"

export default async function MentorshipPage() {
  const { supabase, user } = await getRequestUser()
  if (!user) redirect("/login?next=/mentorship")

  const membership = await readStudentCampusMembership(supabase, user)
  const { data: student } = await supabase.from("student_profiles").select("mentorship_opt_in, university").eq("id", user.id).maybeSingle()
  const alumni = membership.isAlumni

  const { data: mentors } = await supabase
    .from("mentorship_profiles")
    .select("user_id, expertise, industries, topics, capacity, format, is_discoverable")
    .eq("is_discoverable", true)
    .limit(80)
  const mentorIds = (mentors || []).map((m) => m.user_id)
  const { data: mentorSchools } = mentorIds.length
    ? await supabase.from("student_profiles").select("id, university").in("id", mentorIds)
    : { data: [] }
  const schoolById = new Map((mentorSchools || []).map((row) => [row.id, row.university]))
  const campusMentors = (mentors || []).filter((m) => {
    if (!membership.university) return true
    const school = schoolById.get(m.user_id)
    return !school || school.toLowerCase() === membership.university.toLowerCase()
  })
  const { data: names } = campusMentors.length
    ? await supabase.from("profiles").select("id, full_name").in("id", campusMentors.map((m) => m.user_id))
    : { data: [] }
  const nameById = new Map((names || []).map((p) => [p.id, p.full_name]))

  const { data: requests } = await supabase
    .from("mentorship_requests")
    .select("id, student_id, mentor_id, topic, note, status, created_at")
    .or(`student_id.eq.${user.id},mentor_id.eq.${user.id}`)
    .order("created_at", { ascending: false })

  const mine = {
    userId: user.id,
    mentors: campusMentors.map((m) => ({ ...m, name: nameById.get(m.user_id) || "Alumni mentor" })),
    requests: requests || [],
  }

  if (alumni) {
    const { data: profile } = await supabase.from("mentorship_profiles").select("*").eq("user_id", user.id).maybeSingle()
    return <MentorshipAlumniView optedIn={Boolean(student?.mentorship_opt_in)} profile={profile} {...mine} />
  }

  return <MentorshipStudentView {...mine} />
}
