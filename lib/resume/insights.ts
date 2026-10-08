import { htmlToPlain } from "@/lib/resume/html"
import { newId, type JsonResume } from "@/lib/resume/schema"

const STOP = new Set(
  "a an the and or of to for with from into over your you we our their this that these those is are was were be been being as at by on in if then than not no yes role job intern internship student team company hiring looking seeking about will can should would could into across using use used via per plus".split(
    " "
  )
)

const ACTION = /^(led|built|created|designed|developed|shipped|launched|improved|reduced|increased|owned|managed|wrote|taught|researched|analyzed|automated|implemented|collaborated|delivered|ran|grew|founded|mentored)\b/i

export type AtsTip = { ok: boolean; label: string }

export function analyzeResume(resume: JsonResume) {
  const bullets = resume.work.flatMap((job) => job.highlights || []).map((h) => htmlToPlain(h))
  const weakBullets = bullets.filter((h) => h.trim() && !ACTION.test(h.trim()))
  const tips: AtsTip[] = [
    { ok: Boolean(resume.basics.name.trim()), label: "Full name" },
    { ok: Boolean(resume.basics.email?.includes("@")), label: "Email on the page" },
    { ok: Boolean(resume.basics.phone || resume.basics.location?.city), label: "Phone or city" },
    { ok: htmlToPlain(resume.basics.summary || "").length >= 40, label: "A short summary" },
    { ok: resume.education.some((e) => e.institution.trim()), label: "Education" },
    { ok: resume.work.some((j) => j.position || j.name) || resume.projects.some((p) => p.name), label: "Experience or a project" },
    { ok: resume.skills.length >= 4, label: "At least four skills" },
    { ok: weakBullets.length === 0, label: "Bullets start with a verb (Built, Led, Shipped)" },
  ]
  const score = Math.round((tips.filter((t) => t.ok).length / tips.length) * 100)
  return { score, tips, weakBullets }
}

export function extractKeywords(text: string, listed: string[] = []) {
  const fromList = listed.map((s) => s.trim()).filter(Boolean)
  const found = new Map<string, string>()
  for (const skill of fromList) found.set(skill.toLowerCase(), skill)
  for (const raw of text.match(/[A-Za-z][A-Za-z0-9+#.]{1,}/g) || []) {
    const lower = raw.toLowerCase()
    if (STOP.has(lower) || lower.length < 3) continue
    if (!found.has(lower)) found.set(lower, raw)
  }
  return [...found.values()].slice(0, 24)
}

export function matchToJob(resume: JsonResume, jobText: string, requiredSkills: string[] = []) {
  const blob = [
    resume.basics.summary,
    resume.basics.label,
    ...resume.skills.map((s) => s.name),
    ...resume.work.flatMap((j) => [j.position, j.name, j.summary, ...(j.highlights || [])]),
    ...resume.projects.flatMap((p) => [p.name, p.description]),
  ]
    .filter(Boolean)
    .map((value) => htmlToPlain(String(value)))
    .join(" ")
    .toLowerCase()

  const required = requiredSkills.map((s) => s.trim()).filter(Boolean)
  const keywords = extractKeywords(jobText, required).slice(0, 16)
  const pool = required.length ? required : keywords
  const matched: string[] = []
  const missing: string[] = []
  for (const key of pool) {
    if (blob.includes(key.toLowerCase())) matched.push(key)
    else missing.push(key)
  }
  const coverage = pool.length ? Math.round((matched.length / pool.length) * 100) : 0
  return { matched: matched.slice(0, 12), missing: missing.slice(0, 10), coverage }
}

export function tailorResume(resume: JsonResume, opts: { missing: string[]; role?: string; company?: string }): JsonResume {
  const next: JsonResume = structuredClone(resume)
  next.languages = next.languages || []
  next.certificates = next.certificates || []
  next.awards = next.awards || []
  const have = new Set(next.skills.map((s) => s.name.toLowerCase()))
  for (const skill of opts.missing) {
    if (have.has(skill.toLowerCase())) continue
    next.skills.push({ name: skill })
    have.add(skill.toLowerCase())
    if (next.skills.length >= 16) break
  }
  const role = opts.role?.trim()
  const company = opts.company?.trim()
  if (role && !(next.basics.summary || "").toLowerCase().includes(role.toLowerCase())) {
    const line = `Interested in the ${role}${company ? ` at ${company}` : ""}.`
    next.basics.summary = [next.basics.summary?.trim(), line].filter(Boolean).join(" ")
  }
  return next
}

export function emptyLanguage() {
  return { id: newId(), language: "", fluency: "" }
}

export function emptyCertificate() {
  return { id: newId(), name: "", issuer: "", date: "" }
}

export function emptyAward() {
  return { id: newId(), title: "", date: "", summary: "" }
}

export type ResumeTargetJob = {
  id: string
  title: string
  company: string
  description: string | null
  skills: string[]
}
