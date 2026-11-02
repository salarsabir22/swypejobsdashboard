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

export type RankingWeights = {
  skills: number
  location: number
  recency: number
  employer_tier: number
}

export const DEFAULT_RANKING_WEIGHTS: RankingWeights = {
  skills: 0.4,
  location: 0.2,
  recency: 0.25,
  employer_tier: 0.15,
}

export function normalizeRankingWeights(row?: Partial<RankingWeights> | null): RankingWeights {
  const skills = Number(row?.skills ?? DEFAULT_RANKING_WEIGHTS.skills)
  const location = Number(row?.location ?? DEFAULT_RANKING_WEIGHTS.location)
  const recency = Number(row?.recency ?? DEFAULT_RANKING_WEIGHTS.recency)
  const employer_tier = Number(row?.employer_tier ?? DEFAULT_RANKING_WEIGHTS.employer_tier)
  const sum = skills + location + recency + employer_tier
  if (!Number.isFinite(sum) || sum <= 0) return DEFAULT_RANKING_WEIGHTS
  return {
    skills: skills / sum,
    location: location / sum,
    recency: recency / sum,
    employer_tier: employer_tier / sum,
  }
}

export function jobFitScore(opts: {
  studentSkills?: string[] | null
  preferredCategories?: string[] | null
  jobSkills?: string[] | null
  jobCategory?: string | null
  jobLocation?: string | null
  studentLocationHint?: string | null
  remote?: boolean
  createdAt?: string | null
  employerApproved?: boolean
  employerHasWebsite?: boolean
  weights?: RankingWeights | null
}) {
  const w = normalizeRankingWeights(opts.weights)

  const overlap = skillOverlap(opts.studentSkills, opts.jobSkills)
  const skillDenom = Math.max(Math.min((opts.jobSkills || []).length || 1, 6), 1)
  let skillsScore = Math.min(1, overlap.length / skillDenom)
  const cats = (opts.preferredCategories || []).map((c) => c.toLowerCase())
  if (opts.jobCategory && cats.includes(opts.jobCategory.toLowerCase())) {
    skillsScore = Math.min(1, skillsScore + 0.2)
  }

  let locationScore = opts.remote ? 0.7 : 0.35
  const hint = opts.studentLocationHint?.trim().toLowerCase()
  const jobLoc = (opts.jobLocation || "").toLowerCase()
  if (hint && jobLoc.includes(hint)) locationScore = 1
  else if (opts.remote && hint) locationScore = 0.85

  const age = daysSince(opts.createdAt)
  const recencyScore = age < 7 ? 1 : age < 30 ? 0.65 : age < 90 ? 0.35 : 0.15

  const employerScore = opts.employerApproved === false ? 0.15 : opts.employerHasWebsite ? 1 : 0.7

  return (
    (skillsScore * w.skills +
      locationScore * w.location +
      recencyScore * w.recency +
      employerScore * w.employer_tier) *
    100
  )
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

/** Applied (student side, pre-match) → Chatting → Shortlisted → Interview → Offer → Hired. */
export const PIPELINE_STATUSES = ["chatting", "shortlisted", "interview", "offer", "hired", "passed"] as const
export type PipelineStatus = (typeof PIPELINE_STATUSES)[number]

export const PIPELINE_LABEL: Record<PipelineStatus, string> = {
  chatting: "Chatting",
  shortlisted: "Shortlisted",
  interview: "Interview",
  offer: "Offer",
  hired: "Hired",
  passed: "Passed",
}

/** Student-facing notification copy when a recruiter moves them to a stage. `null` = don't notify. */
export const PIPELINE_NOTIFICATION: Record<PipelineStatus, { title: string; body: (job: string) => string } | null> = {
  chatting: null,
  shortlisted: { title: "You’ve been shortlisted", body: (job) => `${job}: the team moved you to their shortlist.` },
  interview: { title: "Interview stage", body: (job) => `${job}: you’ve been moved to the interview stage.` },
  offer: { title: "Offer stage", body: (job) => `${job}: the team has moved you to the offer stage.` },
  hired: { title: "Marked as hired", body: (job) => `${job}: congratulations, you’ve been marked as hired.` },
  passed: null,
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
  if (opts.pipeline === "shortlisted") return "Shortlisted"
  if (opts.hasMatch) return "Chatting"
  if (opts.viewed) return "Viewed"
  return "Applied"
}
