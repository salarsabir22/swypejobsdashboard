/** Alumni career / first-destination survey. */

export const EMPLOYMENT_STATUSES = ["employed", "self_employed", "further_study", "seeking", "not_seeking"] as const
export type EmploymentStatus = (typeof EMPLOYMENT_STATUSES)[number]

export const EMPLOYMENT_LABEL: Record<EmploymentStatus, string> = {
  employed: "Employed",
  self_employed: "Self-employed / freelance",
  further_study: "Further study",
  seeking: "Seeking work",
  not_seeking: "Not seeking work",
}

export const RELATED_OPTIONS = ["yes", "somewhat", "no"] as const
export type RelatedToDegree = (typeof RELATED_OPTIONS)[number]

export type CareerSurvey = {
  surveyYear: number
  employmentStatus: EmploymentStatus
  employer: string
  designation: string
  industry: string
  salaryPkr: string
  relatedToDegree: RelatedToDegree | ""
  satisfaction: string
  furtherStudy: string
  comments: string
}

export function emptySurvey(year = new Date().getFullYear()): CareerSurvey {
  return {
    surveyYear: year,
    employmentStatus: "employed",
    employer: "",
    designation: "",
    industry: "",
    salaryPkr: "",
    relatedToDegree: "",
    satisfaction: "",
    furtherStudy: "",
    comments: "",
  }
}

export function surveyFromRow(row: Record<string, unknown> | null | undefined, fallbackYear: number): CareerSurvey {
  const base = emptySurvey(fallbackYear)
  if (!row) return base
  const status = row.employment_status
  return {
    surveyYear: Number(row.survey_year) || fallbackYear,
    employmentStatus: EMPLOYMENT_STATUSES.includes(status as EmploymentStatus) ? (status as EmploymentStatus) : "employed",
    employer: typeof row.employer === "string" ? row.employer : "",
    designation: typeof row.designation === "string" ? row.designation : "",
    industry: typeof row.industry === "string" ? row.industry : "",
    salaryPkr: row.salary_pkr === null || row.salary_pkr === undefined ? "" : String(row.salary_pkr),
    relatedToDegree: RELATED_OPTIONS.includes(row.related_to_degree as RelatedToDegree) ? (row.related_to_degree as RelatedToDegree) : "",
    satisfaction: row.satisfaction === null || row.satisfaction === undefined ? "" : String(row.satisfaction),
    furtherStudy: typeof row.further_study === "string" ? row.further_study : "",
    comments: typeof row.comments === "string" ? row.comments : "",
  }
}

export function isWorking(status: EmploymentStatus) {
  return status === "employed" || status === "self_employed"
}
