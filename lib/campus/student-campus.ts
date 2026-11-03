import { parseAcademicHistory, primaryAcademicFields } from "@/lib/profile/academics"
import { IOBM_SHORT_NAME, IOBM_UNIVERSITY_NAME } from "@/lib/sso/iobm"
import { jobVisibleOnCampus, reviewKey, sameCampus } from "@/lib/jobs/curation"

export function canonicalizeUniversity(name: string | null | undefined) {
  const value = name?.trim() || ""
  if (!value) return ""
  if (value.toLowerCase().includes("iobm") || value.toLowerCase().includes("institute of business management")) {
    return IOBM_UNIVERSITY_NAME
  }
  return value
}

export function careerOfficeTitle(university: string | null | undefined) {
  const name = university?.trim()
  if (!name) return "Your career office"
  if (sameCampus(name, IOBM_UNIVERSITY_NAME) || name.toLowerCase().includes("iobm")) {
    return `${IOBM_SHORT_NAME} Career Development Center`
  }
  return `${name} career office`
}

export async function readStudentCampusMembership(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: { from: (table: string) => any },
  user: { id: string; user_metadata?: Record<string, unknown> | null }
) {
  type MembershipRow = {
    university?: string | null
    is_alumni?: boolean | null
    academic_history?: unknown
  }
  let row: MembershipRow = {}
  for (const columns of ["university", "university, academic_history", "university, is_alumni, academic_history"]) {
    const { data, error } = await supabase.from("student_profiles").select(columns).eq("id", user.id).maybeSingle()
    if (error || !data || typeof data !== "object") continue
    row = { ...row, ...(data as MembershipRow) }
    if (row.university) break
  }
  const alumni = await supabase.from("student_profiles").select("is_alumni").eq("id", user.id).maybeSingle()
  if (!alumni.error && alumni.data && typeof alumni.data === "object") {
    row = { ...row, is_alumni: (alumni.data as MembershipRow).is_alumni }
  }

  const history = parseAcademicHistory(row?.academic_history)
  const fromHistory = primaryAcademicFields(history)?.university?.trim() || ""
  const fromRow = row?.university?.trim() || ""
  const fromMeta =
    typeof user.user_metadata?.university === "string" ? user.user_metadata.university.trim() : ""
  const ssoIobm =
    user.user_metadata?.sso === "iobm" ||
    (typeof fromMeta === "string" && fromMeta.toLowerCase().includes("iobm"))
  const raw = fromRow || fromHistory || fromMeta || (ssoIobm ? IOBM_UNIVERSITY_NAME : "") || ""
  const university = canonicalizeUniversity(raw) || null
  const isAlumni = row?.is_alumni === true || user.user_metadata?.alumni === true

  if (university && university !== fromRow) {
    const payload = { id: user.id, university }
    const updated = await supabase.from("student_profiles").update({ university }).eq("id", user.id).select("id")
    if (updated.error || !updated.data?.length) {
      await supabase.from("student_profiles").upsert(payload, { onConflict: "id" })
    }
  }

  return { university: university || null, isAlumni }
}

export function belongsToCampus(
  rowUniversity: string | null | undefined,
  studentUniversity: string | null | undefined
) {
  if (!studentUniversity) return !rowUniversity
  if (!rowUniversity) return true
  return sameCampus(rowUniversity, studentUniversity)
}

export type StudentCampusEvent = {
  id: string
  title: string
  kind: string | null
  summary: string | null
  location: string | null
  starts_at: string | null
}

export type StudentCampusAnnouncement = {
  id: string
  title: string
  body: string
  audience: string | null
  requires_ack: boolean | null
}

export type StudentCampusJob = {
  id: string
  title: string
  job_type: string | null
  location: string | null
  is_remote: boolean | null
  company: string | null
  collection: string | null
}

export async function loadStudentCampus(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: { from: (table: string) => any },
  opts: { userId: string; university: string | null; isAlumni: boolean }
): Promise<{
  title: string
  university: string | null
  events: StudentCampusEvent[]
  announcements: StudentCampusAnnouncement[]
  jobs: StudentCampusJob[]
}> {
  const audience = opts.isAlumni ? "alumni" : "students"
  const [eventsRes, announcementsRes, collectionRes, reviewRes, jobsRes] = await Promise.all([
    supabase
      .from("campus_events")
      .select("id, title, kind, summary, location, starts_at, university")
      .order("starts_at", { ascending: true })
      .limit(24),
    supabase
      .from("campus_announcements")
      .select("id, title, body, audience, requires_ack, expires_at, university")
      .order("created_at", { ascending: false })
      .limit(24),
    supabase
      .from("job_collection_items")
      .select("job_id, job_collections!inner(name, university, is_active)")
      .eq("job_collections.is_active", true),
    supabase.from("campus_job_reviews").select("job_id, university, status"),
    supabase
      .from("jobs")
      .select(
        "id, title, job_type, location, is_remote, distribution_scope, target_universities, recruiter_id, recruiter_profiles(company_name, is_approved)"
      )
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(80),
  ])

  const events = ((eventsRes.error ? [] : eventsRes.data) || [])
    .filter((row: { university?: string | null; starts_at?: string | null }) => {
      if (!belongsToCampus(row.university, opts.university)) return false
      if (row.starts_at && new Date(row.starts_at).getTime() < Date.now() - 6 * 60 * 60 * 1000) return false
      return true
    })
    .slice(0, 4) as StudentCampusEvent[]

  const announcements = ((announcementsRes.error ? [] : announcementsRes.data) || [])
    .filter((row: { university?: string | null; audience?: string | null; expires_at?: string | null }) => {
      if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) return false
      if (!belongsToCampus(row.university, opts.university)) return false
      return row.audience === "all" || row.audience === audience
    })
    .slice(0, 4) as StudentCampusAnnouncement[]

  const curated = new Map<string, string>()
  for (const row of collectionRes.error ? [] : collectionRes.data || []) {
    const col = Array.isArray(row.job_collections) ? row.job_collections[0] : row.job_collections
    if (!col || col.is_active === false) continue
    if (opts.university && col.university && !sameCampus(col.university, opts.university)) continue
    if (!curated.has(row.job_id)) curated.set(row.job_id, col.name)
  }
  const reviews = new Map<string, string>()
  for (const row of reviewRes.error ? [] : reviewRes.data || []) {
    if (row.job_id && row.university) reviews.set(reviewKey(row.job_id, row.university), row.status)
  }
  const jobs = ((jobsRes.error ? [] : jobsRes.data) || [])
    .filter((job: {
      id: string
      distribution_scope?: string | null
      target_universities?: string[] | null
      recruiter_profiles?: { company_name?: string | null; is_approved?: boolean | null } | { company_name?: string | null; is_approved?: boolean | null }[] | null
    }) => {
      if (!curated.has(job.id)) return false
      const company = Array.isArray(job.recruiter_profiles) ? job.recruiter_profiles[0] : job.recruiter_profiles
      if (company && company.is_approved === false) return false
      return jobVisibleOnCampus(job, opts.university, reviews)
    })
    .slice(0, 8)
    .map((job: {
      id: string
      title: string
      job_type?: string | null
      location?: string | null
      is_remote?: boolean | null
      recruiter_profiles?: { company_name?: string | null } | { company_name?: string | null }[] | null
    }) => {
      const company = Array.isArray(job.recruiter_profiles) ? job.recruiter_profiles[0] : job.recruiter_profiles
      return {
        id: job.id,
        title: job.title,
        job_type: job.job_type || null,
        location: job.location || null,
        is_remote: job.is_remote ?? null,
        company: company?.company_name || null,
        collection: curated.get(job.id) || null,
      } satisfies StudentCampusJob
    }) as StudentCampusJob[]

  return {
    title: careerOfficeTitle(opts.university),
    university: opts.university,
    events,
    announcements,
    jobs,
  }
}
