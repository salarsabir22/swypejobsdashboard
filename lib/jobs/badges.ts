import { skillOverlap } from "@/lib/match/fit"
import { parseScreeningQuestions } from "@/lib/jobs/screening"

export function jobRequiresVideo(job: { screening_questions?: unknown } | null | undefined) {
  return parseScreeningQuestions(job?.screening_questions).some((q) => q.type === "video" && q.required)
}

export function skillMatchPercent(studentSkills: string[] | null | undefined, jobSkills: string[] | null | undefined) {
  const required = (jobSkills || []).map((s) => s.trim()).filter(Boolean)
  if (!required.length) return null
  const matched = skillOverlap(studentSkills, required)
  return Math.round((matched.length / required.length) * 100)
}

export function fitEncouragement(opts: {
  fitScore?: number | null
  skillPercent?: number | null
}) {
  const skill = opts.skillPercent ?? null
  const score = opts.fitScore ?? null
  if ((skill != null && skill >= 80) || (score != null && score >= 78)) {
    return "You'd be a top applicant"
  }
  if (skill != null && skill >= 45) {
    return `Your profile matches ${skill}% for this job`
  }
  if (score != null && score >= 58) {
    return `Your profile matches ${Math.round(score)}% for this job`
  }
  return null
}

export function isEarlyApplicant(applicationCount: number | null | undefined) {
  if (applicationCount == null) return false
  return applicationCount >= 0 && applicationCount < 5
}
