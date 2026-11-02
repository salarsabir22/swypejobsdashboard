import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { emailUser } from "@/lib/email/send"
import { deadlineReminderEmail } from "@/lib/email/templates"
import { deadlineLabel, todayIso } from "@/lib/jobs/deadline"

export const runtime = "nodejs"
export const maxDuration = 60

/**
 * Daily job: email students who *saved* a role that closes within the next 2 days
 * but haven't applied. Idempotent per (student, job) via email_log.
 *
 * Schedule via vercel.json or any scheduler hitting this URL with
 * `Authorization: Bearer $CRON_SECRET`.
 */

const WINDOW_DAYS = 2
const MAX_EMAILS_PER_RUN = 200

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return false
  const header = request.headers.get("authorization") || ""
  return header === `Bearer ${secret}`
}

function plusDays(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number)
  const dt = new Date(y, m - 1, d + days)
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let admin
  try {
    admin = createAdminClient()
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "admin client unavailable" }, { status: 500 })
  }

  const today = todayIso()
  const until = plusDays(today, WINDOW_DAYS)

  const { data: jobs, error: jobsError } = await admin
    .from("jobs")
    .select("id, title, application_deadline, recruiter_profiles(company_name)")
    .eq("is_active", true)
    .gte("application_deadline", today)
    .lte("application_deadline", until)
  if (jobsError) return NextResponse.json({ error: jobsError.message }, { status: 500 })
  if (!jobs?.length) return NextResponse.json({ ok: true, jobs: 0, emailed: 0 })

  const jobIds = jobs.map((j) => j.id)
  const [{ data: swipes }, { data: priorLogs }] = await Promise.all([
    admin.from("job_swipes").select("student_id, job_id, direction").in("job_id", jobIds).in("direction", ["saved", "right"]),
    admin.from("email_log").select("user_id, data").eq("template", "deadline_reminder").in("data->>job_id", jobIds),
  ])

  const applied = new Set<string>()
  const saved: { studentId: string; jobId: string }[] = []
  for (const s of swipes || []) {
    const key = `${s.student_id}:${s.job_id}`
    if (s.direction === "right") applied.add(key)
    else saved.push({ studentId: s.student_id, jobId: s.job_id })
  }
  const alreadySent = new Set(
    (priorLogs || []).map((l) => `${l.user_id}:${(l.data as { job_id?: string } | null)?.job_id ?? ""}`),
  )

  const jobById = new Map(jobs.map((j) => [j.id, j]))
  let emailed = 0
  let skipped = 0
  for (const { studentId, jobId } of saved) {
    if (emailed >= MAX_EMAILS_PER_RUN) break
    const key = `${studentId}:${jobId}`
    if (applied.has(key) || alreadySent.has(key)) continue
    const job = jobById.get(jobId)
    if (!job) continue
    const rp = Array.isArray(job.recruiter_profiles) ? job.recruiter_profiles[0] : job.recruiter_profiles
    const label = deadlineLabel(job.application_deadline) || "soon"
    const outcome = await emailUser(
      admin,
      studentId,
      (name) =>
        deadlineReminderEmail({
          studentName: name,
          jobTitle: job.title,
          companyName: (rp as { company_name?: string } | null)?.company_name ?? null,
          jobId,
          deadlineLabel: label,
        }),
      { job_id: jobId },
    )
    if (outcome === "sent") emailed += 1
    else skipped += 1
    alreadySent.add(key)
  }

  return NextResponse.json({ ok: true, jobs: jobs.length, candidates: saved.length, emailed, skipped })
}
