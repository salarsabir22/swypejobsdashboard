import type { SupabaseClient } from "@supabase/supabase-js"

const VIEW_MILESTONES = [20, 50, 100, 250]
const APPLY_MILESTONES = [20, 50, 100, 250]
const PROFILE_VIEW_MILESTONES = [30, 60, 100, 250]
const NEW_JOBS_MILESTONE = 20

async function alreadyNotified(
  supabase: SupabaseClient,
  userId: string,
  type: string,
  key: string
) {
  const { data } = await supabase
    .from("notifications")
    .select("id")
    .eq("user_id", userId)
    .eq("type", type)
    .contains("data", { milestone_key: key })
    .limit(1)
  return (data?.length ?? 0) > 0
}

async function notify(
  supabase: SupabaseClient,
  row: {
    user_id: string
    type: string
    title: string
    body: string
    data: Record<string, unknown>
  }
) {
  await supabase.from("notifications").insert(row)
}

export async function recordJobView(
  supabase: SupabaseClient,
  opts: { studentId: string; jobId: string; recruiterId: string; jobTitle?: string | null }
) {
  const { error } = await supabase.from("job_views").insert({
    student_id: opts.studentId,
    job_id: opts.jobId,
  })
  if (error) return

  const { count } = await supabase
    .from("job_views")
    .select("id", { count: "exact", head: true })
    .eq("job_id", opts.jobId)

  const total = count ?? 0
  if (!VIEW_MILESTONES.includes(total)) return

  const key = `job-views-${opts.jobId}-${total}`
  if (await alreadyNotified(supabase, opts.recruiterId, "job_views_milestone", key)) return

  const role = opts.jobTitle ? ` for ${opts.jobTitle}` : ""
  await notify(supabase, {
    user_id: opts.recruiterId,
    type: "job_views_milestone",
    title: `${total}+ views on your job`,
    body: `${total} candidates viewed your listing${role}. Review the strongest fits.`,
    data: { job_id: opts.jobId, count: total, milestone_key: key },
  })
}

export async function notifyApplicationMilestone(
  supabase: SupabaseClient,
  opts: { jobId: string; recruiterId: string; jobTitle?: string | null }
) {
  const { count } = await supabase
    .from("job_swipes")
    .select("id", { count: "exact", head: true })
    .eq("job_id", opts.jobId)
    .eq("direction", "right")

  const total = count ?? 0
  if (!APPLY_MILESTONES.includes(total)) return

  const key = `job-apps-${opts.jobId}-${total}`
  if (await alreadyNotified(supabase, opts.recruiterId, "applications_milestone", key)) return

  const role = opts.jobTitle ? ` on ${opts.jobTitle}` : ""
  await notify(supabase, {
    user_id: opts.recruiterId,
    type: "applications_milestone",
    title: `${total}+ candidates applied${role}`,
    body: "This role is getting traction. Shortlist the people who fit and open chat.",
    data: { job_id: opts.jobId, count: total, milestone_key: key },
  })
}

export async function recordProfileView(
  supabase: SupabaseClient,
  opts: { viewerId: string; studentId: string }
) {
  if (opts.viewerId === opts.studentId) return

  const { error } = await supabase.from("profile_views").insert({
    viewer_id: opts.viewerId,
    student_id: opts.studentId,
  })
  if (error) return

  const { count } = await supabase
    .from("profile_views")
    .select("id", { count: "exact", head: true })
    .eq("student_id", opts.studentId)

  const total = count ?? 0
  if (!PROFILE_VIEW_MILESTONES.includes(total)) return

  const key = `profile-views-${opts.studentId}-${total}`
  if (await alreadyNotified(supabase, opts.studentId, "profile_views_milestone", key)) return

  await notify(supabase, {
    user_id: opts.studentId,
    type: "profile_views_milestone",
    title: `${total} recruiters viewed your profile`,
    body: "Keep your profile complete so they can follow up.",
    data: { count: total, milestone_key: key },
  })
}

export async function notifyNewJobsInCategory(
  supabase: SupabaseClient,
  opts: { category: string }
) {
  const since = new Date()
  since.setUTCDate(since.getUTCDate() - 7)

  const { count } = await supabase
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .eq("category", opts.category)
    .eq("is_active", true)
    .gte("created_at", since.toISOString())

  const total = count ?? 0
  if (total < NEW_JOBS_MILESTONE || total % 10 !== 0) return

  const { data: students } = await supabase
    .from("student_profiles")
    .select("id, preferred_job_categories")

  const matching = (students || []).filter((s) =>
    (s.preferred_job_categories || []).some(
      (c: string) => c.toLowerCase() === opts.category.toLowerCase()
    )
  )

  const key = `new-jobs-${opts.category}-${total}`
  for (const student of matching) {
    if (await alreadyNotified(supabase, student.id, "new_jobs_digest", key)) continue
    await notify(supabase, {
      user_id: student.id,
      type: "new_jobs_digest",
      title: `${total} new ${opts.category} jobs this week`,
      body: `Open Discover to review roles in ${opts.category}.`,
      data: { category: opts.category, count: total, milestone_key: key },
    })
  }
}
