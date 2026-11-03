/**
 * HEC graduate-placement and NBEAC employment-outcome templates.
 * Cohort = students whose graduation year is the report year.
 * Survey figures are self-reported. Hired matches are labeled verified (platform).
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Sheet } from "@/lib/export/formats"
import { EMPLOYMENT_LABEL, EMPLOYMENT_STATUSES, type EmploymentStatus } from "@/lib/profile/survey"
import { listCareerSurveysByYear } from "@/lib/profile/career-survey-store"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = SupabaseClient<any, any, any>

export type AccreditationTemplate = "hec" | "nbeac"

type CohortRow = {
  id: string
  university: string | null
  degree: string | null
  graduation_year: number | null
}

type SurveyRow = {
  student_id: string
  employment_status: string
  employer: string | null
  designation: string | null
  industry: string | null
  salary_pkr: number | null
  related_to_degree: string | null
  satisfaction: number | null
  further_study: string | null
}

function pct(part: number, whole: number) {
  if (!whole) return "—"
  return `${Math.round((part / whole) * 100)}%`
}

function median(values: number[]) {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2)
}

async function inChunks<T>(ids: string[], run: (chunk: string[]) => Promise<T[]>) {
  const out: T[] = []
  for (let i = 0; i < ids.length; i += 150) {
    out.push(...(await run(ids.slice(i, i + 150))))
  }
  return out
}

function countBy(rows: string[]) {
  const map = new Map<string, number>()
  for (const row of rows) {
    const key = row.trim() || "Not specified"
    map.set(key, (map.get(key) || 0) + 1)
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1])
}

export async function buildAccreditation(
  admin: Client,
  opts: { template: AccreditationTemplate; year: number; university?: string | null },
): Promise<{ title: string; subtitle: string; sheets: Sheet[] }> {
  const year = opts.year
  let studentQuery = admin
    .from("student_profiles")
    .select("id, university, degree, graduation_year")
    .eq("graduation_year", year)
    .limit(4000)
  if (opts.university) studentQuery = studentQuery.eq("university", opts.university)
  const { data: cohortData, error: cohortError } = await studentQuery
  if (cohortError) throw new Error(cohortError.message)
  const cohort = (cohortData || []) as CohortRow[]
  const ids = cohort.map((s) => s.id)

  let surveys: SurveyRow[] = []
  let surveyReady = true
  if (ids.length) {
    try {
      surveys = await inChunks(ids, async (chunk) => listCareerSurveysByYear(admin, { year, studentIds: chunk }))
    } catch {
      surveyReady = false
      surveys = []
    }
  }

  const hires = ids.length
    ? await inChunks(ids, async (chunk) => {
        const hiredRes = await admin.from("matches").select("student_id, job_id").in("student_id", chunk).eq("pipeline_status", "hired")
        return (hiredRes.data || []) as { student_id: string; job_id: string }[]
      })
    : []
  const jobIds = [...new Set(hires.map((h) => h.job_id))]
  const jobs = jobIds.length
    ? await inChunks(jobIds, async (chunk) => {
        const jobsRes = await admin.from("jobs").select("id, title, recruiter_profiles(company_name)").in("id", chunk)
        return (jobsRes.data || []) as {
          id: string
          title: string
          recruiter_profiles: { company_name: string | null } | { company_name: string | null }[] | null
        }[]
      })
    : []
  const companyByJob = new Map<string, string>()
  for (const job of jobs) {
    const rp = Array.isArray(job.recruiter_profiles) ? job.recruiter_profiles[0] : job.recruiter_profiles
    companyByJob.set(job.id, rp?.company_name || job.title)
  }
  const verifiedEmployers = countBy(hires.map((h) => companyByJob.get(h.job_id) || "Unknown employer"))

  const byStatus = new Map<EmploymentStatus, number>()
  for (const status of EMPLOYMENT_STATUSES) byStatus.set(status, 0)
  for (const survey of surveys) {
    const status = survey.employment_status as EmploymentStatus
    if (byStatus.has(status)) byStatus.set(status, (byStatus.get(status) || 0) + 1)
  }
  const responded = surveys.length
  const employed = (byStatus.get("employed") || 0) + (byStatus.get("self_employed") || 0)
  const working = surveys.filter((s) => s.employment_status === "employed" || s.employment_status === "self_employed")
  const relevant = working.filter((s) => s.related_to_degree === "yes" || s.related_to_degree === "somewhat").length
  const salaries = working.map((s) => Number(s.salary_pkr)).filter((n) => Number.isFinite(n) && n > 0)
  const avgSalary = salaries.length ? Math.round(salaries.reduce((n, v) => n + v, 0) / salaries.length) : null
  const satisfaction = surveys.map((s) => Number(s.satisfaction)).filter((n) => Number.isFinite(n) && n >= 1 && n <= 5)
  const avgSatisfaction = satisfaction.length ? Math.round((satisfaction.reduce((n, v) => n + v, 0) / satisfaction.length) * 10) / 10 : null
  const noResponse = Math.max(cohort.length - responded, 0)

  const source = surveyReady ? "Self-reported career survey" : "Survey table not migrated — survey rows are empty"
  const campus = opts.university || "All campuses"
  const title =
    opts.template === "hec"
      ? `HEC graduate placement report ${year}`
      : `NBEAC employment outcomes ${year}`

  const summary: Record<string, unknown>[] = [
    { indicator: "Campus", value: campus, source: "Filter" },
    { indicator: "Graduation cohort", value: cohort.length, source: "student_profiles.graduation_year" },
    { indicator: "Survey respondents", value: responded, source },
    { indicator: "Knowledge rate (respondents / cohort)", value: pct(responded, cohort.length), source },
    { indicator: "No response", value: noResponse, source },
    { indicator: "Employed (incl. self-employed)", value: employed, source },
    { indicator: "Placement rate (employed / respondents)", value: pct(employed, responded), source },
    { indicator: "Placement rate (employed / cohort)", value: pct(employed, cohort.length), source },
    { indicator: "Further study", value: byStatus.get("further_study") || 0, source },
    { indicator: "Still seeking", value: byStatus.get("seeking") || 0, source },
    { indicator: "Not seeking", value: byStatus.get("not_seeking") || 0, source },
    { indicator: "Employed in or near field of study", value: pct(relevant, working.length), source },
    { indicator: "Average monthly salary (PKR)", value: avgSalary ?? "—", source },
    { indicator: "Median monthly salary (PKR)", value: median(salaries) ?? "—", source },
    { indicator: "Verified hires on the platform", value: new Set(hires.map((h) => h.student_id)).size, source: "Platform: matches.pipeline_status = hired" },
    { indicator: "Distinct hiring employers (verified)", value: verifiedEmployers.length, source: "Platform" },
  ]
  if (opts.template === "nbeac") {
    summary.push(
      { indicator: "Mean satisfaction (1–5)", value: avgSatisfaction ?? "—", source },
      { indicator: "Satisfaction responses", value: satisfaction.length, source },
    )
  }

  const programs = new Map<string, { cohort: number; responded: number; employed: number; study: number; seeking: number }>()
  const surveyByStudent = new Map(surveys.map((s) => [s.student_id, s]))
  for (const student of cohort) {
    const key = student.degree?.trim() || "Degree not set"
    const bucket = programs.get(key) || { cohort: 0, responded: 0, employed: 0, study: 0, seeking: 0 }
    bucket.cohort += 1
    const survey = surveyByStudent.get(student.id)
    if (survey) {
      bucket.responded += 1
      if (survey.employment_status === "employed" || survey.employment_status === "self_employed") bucket.employed += 1
      if (survey.employment_status === "further_study") bucket.study += 1
      if (survey.employment_status === "seeking") bucket.seeking += 1
    }
    programs.set(key, bucket)
  }
  const byProgram = [...programs.entries()]
    .sort((a, b) => b[1].cohort - a[1].cohort)
    .map(([degree, row]) => ({
      degree,
      cohort: row.cohort,
      responded: row.responded,
      employed: row.employed,
      placement_rate: pct(row.employed, row.responded),
      further_study: row.study,
      seeking: row.seeking,
    }))

  const employers = countBy(working.map((s) => s.employer || "")).slice(0, 25)
  const industries = countBy(working.map((s) => s.industry || "")).slice(0, 15)

  const names = ids.length
    ? await inChunks(ids.slice(0, 1000), async (chunk) => {
        const nameRes = await admin.from("profiles").select("id, full_name").in("id", chunk)
        return (nameRes.data || []) as { id: string; full_name: string | null }[]
      })
    : []
  const nameById = new Map(names.map((p) => [p.id, p.full_name || ""]))
  const degreeById = new Map(cohort.map((s) => [s.id, s.degree || ""]))
  const respondents = surveys.slice(0, 1000).map((s) => ({
    name: nameById.get(s.student_id) || "",
    degree: degreeById.get(s.student_id) || "",
    status: EMPLOYMENT_LABEL[s.employment_status as EmploymentStatus] || s.employment_status,
    employer: s.employer || "",
    designation: s.designation || "",
    industry: s.industry || "",
    salary_pkr: s.salary_pkr ?? "",
    related_to_degree: s.related_to_degree || "",
    further_study: s.further_study || "",
    satisfaction: s.satisfaction ?? "",
    source: "Self-reported",
  }))

  return {
    title,
    subtitle: `${campus} · cohort ${year} · ${surveyReady ? "survey + verified hires" : "verified hires only (survey migration pending)"}`,
    sheets: [
      { name: "Summary", columns: ["indicator", "value", "source"], rows: summary },
      { name: "By program", columns: ["degree", "cohort", "responded", "employed", "placement_rate", "further_study", "seeking"], rows: byProgram },
      { name: "Employers", columns: ["employer", "graduates"], rows: employers.map(([employer, graduates]) => ({ employer, graduates })) },
      { name: "Industries", columns: ["industry", "graduates"], rows: industries.map(([industry, graduates]) => ({ industry, graduates })) },
      {
        name: "Verified employers",
        columns: ["employer", "hires"],
        rows: verifiedEmployers.slice(0, 25).map(([employer, hires]) => ({ employer, hires })),
      },
      {
        name: "Respondents",
        columns: ["name", "degree", "status", "employer", "designation", "industry", "salary_pkr", "related_to_degree", "further_study", "satisfaction", "source"],
        rows: respondents,
      },
    ],
  }
}
