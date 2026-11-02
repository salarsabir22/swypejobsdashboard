import { redirect } from "next/navigation"
import { getRequestUser } from "@/lib/nav/app-shell-user"
import { MentorshipStudentView, MentorshipAlumniView } from "@/components/portal/MentorshipViews"

export default async function MentorshipPage() {
  const { supabase, user } = await getRequestUser()
  if (!user) redirect("/login?next=/mentorship")

  const { data: student } = await supabase.from("student_profiles").select("is_alumni, mentorship_opt_in, university").eq("id", user.id).maybeSingle()
  const alumni = student?.is_alumni === true

  const { data: mentors } = await supabase
    .from("mentorship_profiles")
    .select("user_id, expertise, industries, topics, capacity, format, is_discoverable")
    .eq("is_discoverable", true)
    .limit(40)
  const mentorIds = (mentors || []).map((m) => m.user_id)
  const { data: names } = mentorIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", mentorIds)
    : { data: [] }
  const nameById = new Map((names || []).map((p) => [p.id, p.full_name]))

  const { data: requests } = await supabase
    .from("mentorship_requests")
    .select("id, student_id, mentor_id, topic, note, status, created_at")
    .or(`student_id.eq.${user.id},mentor_id.eq.${user.id}`)
    .order("created_at", { ascending: false })

  const mine = {
    userId: user.id,
    mentors: (mentors || []).map((m) => ({ ...m, name: nameById.get(m.user_id) || "Alumni mentor" })),
    requests: requests || [],
  }

  if (alumni) {
    const { data: profile } = await supabase.from("mentorship_profiles").select("*").eq("user_id", user.id).maybeSingle()
    return <MentorshipAlumniView optedIn={Boolean(student?.mentorship_opt_in)} profile={profile} {...mine} />
  }

  return <MentorshipStudentView {...mine} />
}
