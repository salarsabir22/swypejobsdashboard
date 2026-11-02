import type { Job } from "@/types"

/** Tokenise a query: lowercase, split on whitespace/commas, drop 1-char noise. */
export function searchTokens(query: string) {
  return query
    .toLowerCase()
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1)
}

type SearchableJob = Pick<Job, "title" | "description" | "required_skills" | "nice_to_have_skills" | "category" | "location"> & {
  recruiter_profiles?: { company_name?: string | null } | { company_name?: string | null }[] | null
}

function haystack(job: SearchableJob) {
  const company = Array.isArray(job.recruiter_profiles) ? job.recruiter_profiles[0] : job.recruiter_profiles
  return [
    job.title,
    job.description,
    job.category,
    job.location,
    company?.company_name,
    ...(job.required_skills || []),
    ...(job.nice_to_have_skills || []),
  ]
    .filter(Boolean)
    .join(" \n ")
    .toLowerCase()
}

/** Every token must appear somewhere in title, description, category, location, company, or skills. */
export function jobMatchesKeyword(job: SearchableJob, query: string) {
  const tokens = searchTokens(query)
  if (tokens.length === 0) return true
  const text = haystack(job)
  return tokens.every((t) => text.includes(t))
}

/** True when the job's pay range reaches at least `min` (jobs without pay info are excluded when min is set). */
export function jobMeetsMinSalary(job: Pick<Job, "salary_min" | "salary_max">, min: number | null) {
  if (!min) return true
  const top = job.salary_max ?? job.salary_min ?? null
  return top !== null && top >= min
}
