/**
 * Full-dataset CSV exports for the campus/admin console (1-click export and reporting).
 * Runs with the service-role client inside /api/admin/export. Row cap keeps a single request bounded.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import type { AdminModule } from "@/lib/admin/modules"
import { applicationStatus } from "@/lib/match/fit"
import { currentRole, parseCareerHistory } from "@/lib/profile/career"

export const EXPORT_DATASETS = ["employers", "jobs", "students", "applications", "placements"] as const
export type ExportDataset = (typeof EXPORT_DATASETS)[number]

export const EXPORT_LABEL: Record<ExportDataset, string> = {
  employers: "Employers",
  jobs: "Job postings",
  students: "Students & alumni",
  applications: "Applications",
  placements: "Placements (hired)",
}

/** Which admin module a staff member needs to pull each dataset. */
export const EXPORT_MODULE: Record<ExportDataset, AdminModule> = {
  employers: "employers",
  jobs: "jobs",
  students: "users",
  applications: "analytics",
  placements: "analytics",
}

export const EXPORT_ROW_CAP = 5000

export type ExportRange = { from?: string | null; to?: string | null }

export type ExportResult = {
  filename: string
  columns: string[]
  rows: Record<string, unknown>[]
  truncated: boolean
}

export function isExportDataset(value: unknown): value is ExportDataset {
  return typeof value === "string" && (EXPORT_DATASETS as readonly string[]).includes(value)
}

/** Accepts YYYY-MM-DD; returns null for anything else. */
export function parseDateParam(value: unknown): string | null {
  if (typeof value !== "string") return null
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  return Number.isNaN(d.getTime()) ? null : value
}

export function toCsv(columns: string[], rows: Record<string, unknown>[]) {
  const escape = (value: unknown) => {
    if (value === null || value === undefined) return ""
    const s = Array.isArray(value) ? value.join("; ") : typeof value === "object" ? JSON.stringify(value) : String(value)
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [columns.join(","), ...rows.map((row) => columns.map((c) => escape(row[c])).join(","))]
  // BOM so Excel opens UTF-8 correctly.
  return `\uFEFF${lines.join("\r\n")}\r\n`
}

function rangeSuffix(range: ExportRange) {
  if (range.from && range.to) return `${range.from}_to_${range.to}`
  if (range.from) return `from_${range.from}`
  if (range.to) return `to_${range.to}`
  return new Date().toISOString().slice(0, 10)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = SupabaseClient<any, any, any>

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyRange<Q extends { gte: (c: string, v: string) => any; lte: (c: string, v: string) => any }>(
  query: Q,
  column: string,
  range: ExportRange
): Q {
  let q = query
  if (range.from) q = q.gte(column, `${range.from}T00:00:00`)
  if (range.to) q = q.lte(column, `${range.to}T23:59:59.999`)
  return q
}

function one<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null)
}

async function exportEmployers(admin: Client, range: ExportRange): Promise<ExportResult> {
  const query = applyRange(
    admin
      .from("recruiter_profiles")
      .select("id, company_name, industry, employee_count, website_url, is_approved, created_at, profiles(full_name)")
      .order("created_at", { ascending: false })
      .limit(EXPORT_ROW_CAP + 1),
    "created_at",
    range
  )
  const { data, error } = await query
  if (error) throw new Error(error.message)
  const list = data || []
  const ids = list.map((r) => r.id)
  const [jobsRes, hiresRes] = await Promise.all([
    ids.length ? admin.from("jobs").select("recruiter_id, is_active").in("recruiter_id", ids) : { data: [] as { recruiter_id: string; is_active: boolean }[] },
    ids.length
      ? admin.from("matches").select("recruiter_id").in("recruiter_id", ids).eq("pipeline_status", "hired")
      : { data: [] as { recruiter_id: string }[] },
  ])
  const jobsBy = new Map<string, { total: number; live: number }>()
  for (const j of jobsRes.data || []) {
    const cur = jobsBy.get(j.recruiter_id) || { total: 0, live: 0 }
    cur.total += 1
    if (j.is_active) cur.live += 1
    jobsBy.set(j.recruiter_id, cur)
  }
  const hiresBy = new Map<string, number>()
  for (const m of hiresRes.data || []) hiresBy.set(m.recruiter_id, (hiresBy.get(m.recruiter_id) || 0) + 1)

  const rows = list.slice(0, EXPORT_ROW_CAP).map((r) => ({
    employer_id: r.id,
    company: r.company_name,
    contact_name: one(r.profiles as { full_name: string | null } | { full_name: string | null }[] | null)?.full_name ?? "",
    industry: r.industry ?? "",
    company_size: r.employee_count ?? "",
    website: r.website_url ?? "",
    status: r.is_approved ? "approved" : "pending",
    jobs_posted: jobsBy.get(r.id)?.total ?? 0,
    jobs_live: jobsBy.get(r.id)?.live ?? 0,
    hires: hiresBy.get(r.id) ?? 0,
    registered_at: r.created_at,
  }))
  return {
    filename: `employers_${rangeSuffix(range)}.csv`,
    columns: Object.keys(rows[0] || { employer_id: "" }),
    rows,
    truncated: list.length > EXPORT_ROW_CAP,
  }
}

async function exportJobs(admin: Client, range: ExportRange): Promise<ExportResult> {
  const base = () =>
    applyRange(
      admin.from("jobs").select("*, recruiter_profiles(company_name)").order("created_at", { ascending: false }).limit(EXPORT_ROW_CAP + 1),
      "created_at",
      range
    )
  const { data, error } = await base()
  if (error) throw new Error(error.message)
  const list = data || []
  const ids = list.map((j) => j.id)
  const [appsRes, matchesRes] = await Promise.all([
    ids.length ? admin.from("job_swipes").select("job_id").in("job_id", ids).eq("direction", "right") : { data: [] as { job_id: string }[] },
    ids.length ? admin.from("matches").select("job_id, pipeline_status").in("job_id", ids) : { data: [] as { job_id: string; pipeline_status: string | null }[] },
  ])
  const appsBy = new Map<string, number>()
  for (const a of appsRes.data || []) appsBy.set(a.job_id, (appsBy.get(a.job_id) || 0) + 1)
  const hiresBy = new Map<string, number>()
  const shortlistBy = new Map<string, number>()
  for (const m of matchesRes.data || []) {
    shortlistBy.set(m.job_id, (shortlistBy.get(m.job_id) || 0) + 1)
    if (m.pipeline_status === "hired") hiresBy.set(m.job_id, (hiresBy.get(m.job_id) || 0) + 1)
  }

  const rows = list.slice(0, EXPORT_ROW_CAP).map((j) => ({
    job_id: j.id,
    title: j.title,
    company: one(j.recruiter_profiles as { company_name: string } | { company_name: string }[] | null)?.company_name ?? "",
    type: j.job_type,
    category: j.category ?? "",
    location: j.is_remote ? "Remote" : j.location ?? "",
    salary_min: j.salary_min ?? "",
    salary_max: j.salary_max ?? "",
    currency: j.salary_currency ?? "",
    required_skills: j.required_skills ?? [],
    degree_programs: j.degree_programs ?? [],
    graduation_years: j.graduation_years ?? [],
    min_cgpa: j.min_cgpa ?? "",
    experience_level: j.experience_level ?? "",
    alumni_only: j.alumni_only ? "yes" : "",
    deadline: j.application_deadline ?? "",
    status: j.is_active ? "live" : "offline",
    applications: appsBy.get(j.id) ?? 0,
    matched: shortlistBy.get(j.id) ?? 0,
    hires: hiresBy.get(j.id) ?? 0,
    posted_at: j.created_at,
  }))
  return {
    filename: `jobs_${rangeSuffix(range)}.csv`,
    columns: Object.keys(rows[0] || { job_id: "" }),
    rows,
    truncated: list.length > EXPORT_ROW_CAP,
  }
}

async function exportStudents(admin: Client, range: ExportRange): Promise<ExportResult> {
  const baseCols =
    "id, university, degree, graduation_year, still_enrolled, current_semester, cgpa, skills, linkedin_url, resume_url, created_at, profiles(full_name, role)"
  const studentQuery = (cols: string) =>
    applyRange(
      admin
        .from("student_profiles")
        .select(cols)
        .order("created_at", { ascending: false })
        .limit(EXPORT_ROW_CAP + 1),
      "created_at",
      range
    )
  type StudentExportRow = {
    id: string
    university: string | null
    degree: string | null
    graduation_year: number | null
    still_enrolled: boolean | null
    current_semester: number | null
    cgpa: number | null
    skills: string[] | null
    linkedin_url: string | null
    resume_url: string | null
    created_at: string
    profiles: { full_name: string | null } | { full_name: string | null }[] | null
    is_alumni?: boolean | null
    mentorship_opt_in?: boolean | null
    work_history?: unknown
  }
  // Alumni / career-history columns may not exist until their migrations run.
  let res = await studentQuery(`${baseCols}, is_alumni, mentorship_opt_in, work_history`)
  if (res.error) res = await studentQuery(baseCols)
  if (res.error) throw new Error(res.error.message)
  const list = (res.data || []) as unknown as StudentExportRow[]
  const ids = list.map((s) => s.id)
  const [appsRes, matchesRes] = await Promise.all([
    ids.length ? admin.from("job_swipes").select("student_id").in("student_id", ids).eq("direction", "right") : { data: [] as { student_id: string }[] },
    ids.length ? admin.from("matches").select("student_id, pipeline_status").in("student_id", ids) : { data: [] as { student_id: string; pipeline_status: string | null }[] },
  ])
  const appsBy = new Map<string, number>()
  for (const a of appsRes.data || []) appsBy.set(a.student_id, (appsBy.get(a.student_id) || 0) + 1)
  const hired = new Set<string>()
  const interviews = new Map<string, number>()
  for (const m of matchesRes.data || []) {
    if (m.pipeline_status === "hired") hired.add(m.student_id)
    if (m.pipeline_status === "interview" || m.pipeline_status === "offer" || m.pipeline_status === "hired") {
      interviews.set(m.student_id, (interviews.get(m.student_id) || 0) + 1)
    }
  }
  const thisYear = new Date().getFullYear()

  const rows = list.slice(0, EXPORT_ROW_CAP).map((s) => {
    const year = Number(s.graduation_year)
    const alumni = s.is_alumni === true || (!s.still_enrolled && Number.isFinite(year) && year > 0 && year < thisYear)
    const role = alumni ? currentRole(parseCareerHistory(s).work) : null
    return {
      student_id: s.id,
      name: one(s.profiles)?.full_name ?? "",
      university: s.university ?? "",
      degree: s.degree ?? "",
      graduation_year: s.graduation_year ?? "",
      status: alumni ? "alumni" : s.still_enrolled ? "enrolled" : "graduating",
      current_employer: role?.name ?? "",
      designation: role?.position ?? "",
      employed_since: role?.startDate ?? "",
      mentor: alumni && s.mentorship_opt_in ? "yes" : "",
      semester: s.current_semester ?? "",
      cgpa: s.cgpa ?? "",
      skills: s.skills ?? [],
      linkedin: s.linkedin_url ?? "",
      has_resume: s.resume_url ? "yes" : "no",
      applications: appsBy.get(s.id) ?? 0,
      interviews_or_offers: interviews.get(s.id) ?? 0,
      placed: hired.has(s.id) ? "yes" : "no",
      joined_at: s.created_at,
    }
  })
  return {
    filename: `students_${rangeSuffix(range)}.csv`,
    columns: Object.keys(rows[0] || { student_id: "" }),
    rows,
    truncated: list.length > EXPORT_ROW_CAP,
  }
}

async function exportApplications(admin: Client, range: ExportRange): Promise<ExportResult> {
  const { data, error } = await applyRange(
    admin
      .from("job_swipes")
      .select("id, student_id, job_id, created_at, jobs(title, job_type, recruiter_id, recruiter_profiles(company_name)), profiles!job_swipes_student_id_fkey(full_name)")
      .eq("direction", "right")
      .order("created_at", { ascending: false })
      .limit(EXPORT_ROW_CAP + 1),
    "created_at",
    range
  )
  // The profiles join name may differ per schema; fall back without it.
  type AppRow = {
    id: string
    student_id: string
    job_id: string
    created_at: string
    jobs?: unknown
    profiles?: { full_name: string | null } | { full_name: string | null }[] | null
  }
  let list: AppRow[] = (data || []) as AppRow[]
  let nameById = new Map<string, string>()
  if (error) {
    const retry = await applyRange(
      admin
        .from("job_swipes")
        .select("id, student_id, job_id, created_at, jobs(title, job_type, recruiter_id, recruiter_profiles(company_name))")
        .eq("direction", "right")
        .order("created_at", { ascending: false })
        .limit(EXPORT_ROW_CAP + 1),
      "created_at",
      range
    )
    if (retry.error) throw new Error(retry.error.message)
    list = (retry.data || []) as AppRow[]
    const studentIds = [...new Set(list.map((r) => r.student_id))]
    if (studentIds.length) {
      const { data: profiles } = await admin.from("profiles").select("id, full_name").in("id", studentIds)
      nameById = new Map((profiles || []).map((p) => [p.id, p.full_name || ""]))
    }
  }

  const pairs = new Set(list.map((r) => `${r.student_id}:${r.job_id}`))
  const matchBy = new Map<string, { pipeline_status: string | null; is_archived: boolean }>()
  if (list.length) {
    const { data: matches } = await admin
      .from("matches")
      .select("student_id, job_id, pipeline_status, is_archived")
      .in("job_id", [...new Set(list.map((r) => r.job_id))])
    for (const m of matches || []) {
      const key = `${m.student_id}:${m.job_id}`
      if (pairs.has(key)) matchBy.set(key, { pipeline_status: m.pipeline_status, is_archived: Boolean(m.is_archived) })
    }
  }

  const rows = list.slice(0, EXPORT_ROW_CAP).map((r) => {
    const job = one(r.jobs as Record<string, unknown> | Record<string, unknown>[] | null) as
      | { title?: string; job_type?: string; recruiter_profiles?: { company_name: string } | { company_name: string }[] | null }
      | null
    const match = matchBy.get(`${r.student_id}:${r.job_id}`)
    const profile = one((r as { profiles?: { full_name: string | null } | { full_name: string | null }[] | null }).profiles)
    return {
      application_id: r.id,
      student_id: r.student_id,
      student_name: profile?.full_name ?? nameById.get(r.student_id) ?? "",
      job_id: r.job_id,
      job_title: job?.title ?? "",
      job_type: job?.job_type ?? "",
      company: one(job?.recruiter_profiles ?? null)?.company_name ?? "",
      stage: applicationStatus({ hasMatch: Boolean(match), pipeline: match?.pipeline_status, archived: match?.is_archived }),
      applied_at: r.created_at,
    }
  })
  return {
    filename: `applications_${rangeSuffix(range)}.csv`,
    columns: Object.keys(rows[0] || { application_id: "" }),
    rows,
    truncated: list.length > EXPORT_ROW_CAP,
  }
}

async function exportPlacements(admin: Client, range: ExportRange): Promise<ExportResult> {
  const { data, error } = await applyRange(
    admin
      .from("matches")
      .select("id, student_id, recruiter_id, job_id, pipeline_status, created_at, jobs(title, job_type, location, is_remote, recruiter_profiles(company_name, industry))")
      .eq("pipeline_status", "hired")
      .order("created_at", { ascending: false })
      .limit(EXPORT_ROW_CAP + 1),
    "created_at",
    range
  )
  if (error) throw new Error(error.message)
  const list = data || []
  const studentIds = [...new Set(list.map((m) => m.student_id))]
  const [profilesRes, studentsRes] = await Promise.all([
    studentIds.length ? admin.from("profiles").select("id, full_name").in("id", studentIds) : { data: [] as { id: string; full_name: string | null }[] },
    studentIds.length
      ? admin.from("student_profiles").select("id, university, degree, graduation_year").in("id", studentIds)
      : { data: [] as { id: string; university: string | null; degree: string | null; graduation_year: number | null }[] },
  ])
  const nameById = new Map((profilesRes.data || []).map((p) => [p.id, p.full_name || ""]))
  const studentById = new Map((studentsRes.data || []).map((s) => [s.id, s]))

  const rows = list.slice(0, EXPORT_ROW_CAP).map((m) => {
    const job = one(m.jobs as Record<string, unknown> | Record<string, unknown>[] | null) as
      | { title?: string; job_type?: string; location?: string | null; is_remote?: boolean; recruiter_profiles?: { company_name: string; industry: string | null } | { company_name: string; industry: string | null }[] | null }
      | null
    const company = one(job?.recruiter_profiles ?? null)
    const student = studentById.get(m.student_id)
    return {
      placement_id: m.id,
      student_id: m.student_id,
      student_name: nameById.get(m.student_id) ?? "",
      degree: student?.degree ?? "",
      graduation_year: student?.graduation_year ?? "",
      job_title: job?.title ?? "",
      job_type: job?.job_type ?? "",
      company: company?.company_name ?? "",
      industry: company?.industry ?? "",
      location: job?.is_remote ? "Remote" : job?.location ?? "",
      matched_at: m.created_at,
    }
  })
  return {
    filename: `placements_${rangeSuffix(range)}.csv`,
    columns: Object.keys(rows[0] || { placement_id: "" }),
    rows,
    truncated: list.length > EXPORT_ROW_CAP,
  }
}

export async function buildExport(admin: Client, dataset: ExportDataset, range: ExportRange): Promise<ExportResult> {
  switch (dataset) {
    case "employers":
      return exportEmployers(admin, range)
    case "jobs":
      return exportJobs(admin, range)
    case "students":
      return exportStudents(admin, range)
    case "applications":
      return exportApplications(admin, range)
    case "placements":
      return exportPlacements(admin, range)
  }
}

export type ExportFormat = "csv" | "xls" | "pdf"

export function exportHref(dataset: ExportDataset, range?: ExportRange, format: ExportFormat = "csv") {
  const q = new URLSearchParams({ dataset })
  if (format !== "csv") q.set("format", format)
  if (range?.from) q.set("from", range.from)
  if (range?.to) q.set("to", range.to)
  return `/api/admin/export?${q.toString()}`
}
