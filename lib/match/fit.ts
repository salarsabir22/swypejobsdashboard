export function skillOverlap(left: string[] | null | undefined, right: string[] | null | undefined) {
  const a = new Set((left || []).map((s) => s.trim().toLowerCase()).filter(Boolean))
  const b = (right || []).map((s) => s.trim()).filter(Boolean)
  return b.filter((s) => a.has(s.toLowerCase()))
}

function daysSince(iso?: string | null) {
  if (!iso) return Number.POSITIVE_INFINITY
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return Number.POSITIVE_INFINITY
  return (Date.now() - t) / 86_400_000
}

export function jobFitScore(opts: {
  studentSkills?: string[] | null
  preferredCategories?: string[] | null
  jobSkills?: string[] | null
  jobCategory?: string | null
  remote?: boolean
  createdAt?: string | null
}) {
  const overlap = skillOverlap(opts.studentSkills, opts.jobSkills)
  let n = overlap.length * 3
  const cats = (opts.preferredCategories || []).map((c) => c.toLowerCase())
  if (opts.jobCategory && cats.includes(opts.jobCategory.toLowerCase())) n += 5
  if (opts.remote) n += 1
  const age = daysSince(opts.createdAt)
  if (age < 7) n += 2
  else if (age < 30) n += 1
  return n
}

export function whyThisJob(opts: {
  studentSkills?: string[] | null
  preferredCategories?: string[] | null
  jobSkills?: string[] | null
  jobCategory?: string | null
  remote?: boolean
  createdAt?: string | null
}) {
  const reasons: string[] = []
  const skills = skillOverlap(opts.studentSkills, opts.jobSkills)
  if (skills.length) reasons.push(`${skills.slice(0, 3).join(", ")} match`)
  const cats = (opts.preferredCategories || []).map((c) => c.toLowerCase())
  if (opts.jobCategory && cats.includes(opts.jobCategory.toLowerCase())) {
    reasons.push(opts.jobCategory)
  }
  if (daysSince(opts.createdAt) < 7) reasons.push("New")
  return reasons.slice(0, 3)
}

export function candidateFitScore(opts: {
  jobSkills?: string[] | null
  candidateSkills?: string[] | null
  applied?: boolean
}) {
  const overlap = skillOverlap(opts.jobSkills, opts.candidateSkills)
  return overlap.length * 3 + (opts.applied ? 8 : 0)
}

export function whyThisCandidate(opts: {
  jobSkills?: string[] | null
  candidateSkills?: string[] | null
  university?: string | null
  applied?: boolean
}) {
  const reasons: string[] = []
  if (opts.applied) reasons.push("Applied")
  const skills = skillOverlap(opts.jobSkills, opts.candidateSkills)
  if (skills.length) reasons.push(`${skills.slice(0, 3).join(", ")} overlap`)
  return reasons.slice(0, 3)
}

export const PIPELINE_STATUSES = ["chatting", "interview", "offer", "hired", "passed"] as const
export type PipelineStatus = (typeof PIPELINE_STATUSES)[number]

export const PIPELINE_LABEL: Record<PipelineStatus, string> = {
  chatting: "Chatting",
  interview: "Interview",
  offer: "Offer",
  hired: "Hired",
  passed: "Passed",
}

export function applicationStatus(opts: {
  hasMatch: boolean
  pipeline?: string | null
  viewed?: boolean
  archived?: boolean
}) {
  if (opts.archived || opts.pipeline === "passed") return "Closed"
  if (opts.pipeline === "hired") return "Hired"
  if (opts.pipeline === "offer") return "Offer"
  if (opts.pipeline === "interview") return "Interview"
  if (opts.hasMatch) return "Chatting"
  if (opts.viewed) return "Viewed"
  return "Applied"
}
