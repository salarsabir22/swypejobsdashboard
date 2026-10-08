const SCAM = [
  /upfront fee/i,
  /registration fee/i,
  /\bcrypto\b/i,
  /bitcoin/i,
  /\bmlm\b/i,
  /pyramid/i,
  /whatsapp only/i,
  /send (your )?(ssn|nid|cnic|bank details|credit card)/i,
  /guaranteed (income|\$)/i,
  /\$\s?10,?000\s*\/\s*(week|day)/i,
  /work from home guaranteed/i,
]

const DISCRIM = [
  /only (males?|females?|men|women)\b/i,
  /no pregnan/i,
  /must be (under|over) \d+/i,
  /native speaker only/i,
  /(no|not for) (foreigners|immigrants)/i,
]

export function jobFlags(text: string) {
  const flags: string[] = []
  if (SCAM.some((r) => r.test(text))) flags.push("scam_language")
  if (DISCRIM.some((r) => r.test(text))) flags.push("discriminatory")
  return flags
}

export function jobQualityScore(job: {
  description?: string | null
  salary_min?: number | null
  salary_max?: number | null
  required_skills?: string[] | null
  location?: string | null
}) {
  let score = 40
  const desc = job.description?.trim() || ""
  if (desc.length > 80) score += 15
  if (desc.length > 240) score += 10
  if (job.salary_min || job.salary_max) score += 20
  if ((job.required_skills || []).length) score += 10
  if (job.location) score += 5
  return Math.min(100, score)
}

export function employerRisk(opts: {
  website?: string | null
  description?: string | null
  createdAt?: string | null
  reportCount?: number
  email?: string | null
}) {
  let score = 10
  const reasons: string[] = []
  if (!opts.website) {
    score += 20
    reasons.push("No website")
  }
  if (!opts.description || opts.description.length < 40) {
    score += 15
    reasons.push("Thin company profile")
  }
  if (opts.createdAt && Date.now() - new Date(opts.createdAt).getTime() < 7 * 86400000) {
    score += 15
    reasons.push("New domain / new account")
  }
  const email = (opts.email || "").toLowerCase()
  if (/@(gmail|yahoo|hotmail|outlook|icloud)\./.test(email)) {
    score += 25
    reasons.push("Free email")
  }
  if ((opts.reportCount || 0) > 0) {
    score += Math.min(30, opts.reportCount! * 10)
    reasons.push("Previous flags")
  }
  return { score: Math.min(100, score), reasons }
}
