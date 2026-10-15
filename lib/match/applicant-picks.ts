import { skillOverlap } from "@/lib/match/fit"
import { htmlToPlain } from "@/lib/resume/html"
import { parseResumeLibrary } from "@/lib/resume/schema"

export type PickSource = "ai" | "profile"

export type ApplicantPick = {
  studentId: string
  score: number
  reason: string
}

export type JobBrief = {
  title: string
  description: string
  requiredSkills: string[]
  niceSkills: string[]
  category: string | null
}

export type ApplicantBrief = {
  id: string
  name: string
  university: string | null
  degree: string | null
  graduationYear: number | null
  skills: string[]
  bio: string
  resume: string
  answers: string
}

const STOP = new Set([
  "with",
  "that",
  "this",
  "from",
  "your",
  "have",
  "will",
  "their",
  "about",
  "into",
  "over",
  "than",
  "then",
  "them",
  "they",
  "been",
  "were",
  "what",
  "when",
  "where",
  "which",
  "while",
  "would",
  "could",
  "should",
  "role",
  "team",
  "work",
  "using",
  "and",
  "the",
  "for",
  "you",
  "our",
  "are",
  "job",
  "looking",
  "candidate",
  "experience",
  "skills",
  "ability",
  "strong",
  "including",
  "within",
  "across",
  "other",
  "such",
  "able",
])

function clip(value: string, max: number) {
  const text = value.replace(/\s+/g, " ").trim()
  return text.length > max ? `${text.slice(0, max - 1).trim()}…` : text
}

function tokens(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 4 && !STOP.has(word))
}

function unique(list: string[]) {
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of list) {
    const key = item.toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(item)
  }
  return out
}

function listPhrase(items: string[]) {
  if (items.length <= 1) return items[0] || ""
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`
}

function sentence(parts: string[]) {
  const text = parts.filter(Boolean).slice(0, 2).join(". ")
  if (!text) return "Applied to this listing."
  return /[.!?]$/.test(text) ? text : `${text}.`
}

export function resumePlainText(raw: unknown) {
  const docs = parseResumeLibrary(raw)
  const doc = docs.find((item) => item.isProfile) || docs[0]
  if (!doc) return ""
  const resume = doc.resume
  const parts = [
    resume.basics.label,
    htmlToPlain(resume.basics.summary || ""),
    ...resume.skills.flatMap((skill) => [skill.name, ...(skill.keywords || [])]),
    ...resume.work.flatMap((job) => [job.position, job.name, htmlToPlain(job.summary || ""), ...(job.highlights || []).map(htmlToPlain)]),
    ...resume.projects.flatMap((project) => [project.name, htmlToPlain(project.description || ""), ...(project.highlights || []).map(htmlToPlain)]),
    ...resume.education.map((school) => [school.studyType, school.area, school.institution].filter(Boolean).join(" ")),
    ...resume.certificates.map((item) => item.name),
    ...resume.awards.map((item) => item.title),
  ]
  return clip(parts.filter(Boolean).join(" "), 700)
}

export function rankApplicantsLocally(job: JobBrief, applicants: ApplicantBrief[]): ApplicantPick[] {
  const required = unique(job.requiredSkills)
  const nice = unique(job.niceSkills)
  const jobTokens = unique(tokens(`${job.title} ${job.description} ${job.category || ""}`)).slice(0, 40)
  const category = job.category?.trim().toLowerCase() || ""

  const ranked = applicants.map((person) => {
    const skillHits = skillOverlap(person.skills, required)
    const niceHits = skillOverlap(person.skills, nice)
    let score = 0
    const reasons: string[] = []

    if (required.length) {
      score += Math.round((skillHits.length / required.length) * 52)
      if (skillHits.length) reasons.push(`Matches ${listPhrase(skillHits.slice(0, 3))}`)
    }
    if (nice.length) score += Math.round((niceHits.length / nice.length) * 16)

    const blob = new Set(tokens(`${person.bio} ${person.resume} ${person.answers} ${person.degree || ""} ${person.skills.join(" ")}`))
    const textHits = jobTokens.filter((token) => blob.has(token))
    if (jobTokens.length) {
      const weight = required.length ? 20 : 48
      score += Math.round((textHits.length / jobTokens.length) * weight)
    }
    if (!reasons.length && textHits.length >= 2) reasons.push("Resume and answers line up with this listing")

    if (category && `${person.resume} ${person.bio}`.toLowerCase().includes(category)) score += 6
    if (person.answers.trim().length > 40) {
      score += 4
      if (!reasons.length) reasons.push("Answered the application in detail")
    }
    if (!reasons.length) reasons.push("Applied to this listing")

    return {
      studentId: person.id,
      score: Math.max(8, Math.min(97, score)),
      reason: sentence(reasons),
    }
  })

  ranked.sort((a, b) => b.score - a.score || a.studentId.localeCompare(b.studentId))
  return ranked
}

export function topPicks(ai: ApplicantPick[] | null, local: ApplicantPick[], limit = 10): { source: PickSource; picks: ApplicantPick[] } {
  const seen = new Set<string>()
  const picks: ApplicantPick[] = []
  const add = (row: ApplicantPick) => {
    if (seen.has(row.studentId) || picks.length >= limit) return
    seen.add(row.studentId)
    picks.push(row)
  }
  if (ai?.length) {
    for (const row of [...ai].sort((a, b) => b.score - a.score)) add(row)
    for (const row of local) add(row)
    return { source: "ai", picks }
  }
  for (const row of local) add(row)
  return { source: "profile", picks }
}

export function briefForModel(person: ApplicantBrief) {
  return {
    id: person.id,
    name: person.name,
    school: person.university,
    degree: person.degree,
    graduationYear: person.graduationYear,
    skills: person.skills.slice(0, 24),
    bio: clip(person.bio, 280),
    resume: clip(person.resume, 700),
    answers: clip(person.answers, 600),
  }
}
