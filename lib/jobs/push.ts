/**
 * In-app notice to students who match a live job. Capped so one posting cannot fan out unbounded.
 * Skips anyone already notified for this job.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import { studentEligibility, type TargetableStudent } from "@/lib/jobs/targeting"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = SupabaseClient<any, any, any>

const CAP = 150

export async function pushJobToMatches(admin: Client, jobId: string) {
  const full = "id, title, is_active, recruiter_id, required_semesters, degree_programs, graduation_years, min_cgpa, experience_level, alumni_only, target_genders, departments, location_preferences"
  let jobRes = await admin.from("jobs").select(full).eq("id", jobId).maybeSingle()
  if (jobRes.error) {
    jobRes = await admin.from("jobs").select("id, title, is_active, recruiter_id, required_semesters").eq("id", jobId).maybeSingle()
  }
  const job = jobRes.data
  if (jobRes.error || !job?.is_active) return { notified: 0 }

  const { data: students } = await admin
    .from("student_profiles")
    .select("id, degree, graduation_year, cgpa, still_enrolled, current_semester, is_alumni, gender, department, preferred_locations")
    .limit(800)
  const { data: prior } = await admin.from("notifications").select("user_id").eq("type", "job_match").contains("data", { job_id: jobId }).limit(1000)
  const already = new Set((prior || []).map((row) => row.user_id as string))

  const matches = (students || []).filter((student) => {
    if (already.has(student.id)) return false
    return studentEligibility(job, student as TargetableStudent).eligible
  }).slice(0, CAP)

  if (!matches.length) return { notified: 0 }
  const rows = matches.map((student) => ({
    user_id: student.id,
    type: "job_match",
    title: "A new role matches your profile",
    body: `${job.title} is open to people with your background.`,
    data: { job_id: jobId, recruiter_id: job.recruiter_id },
  }))
  const { error: insertError } = await admin.from("notifications").insert(rows)
  if (insertError) return { notified: 0 }
  return { notified: rows.length }
}
