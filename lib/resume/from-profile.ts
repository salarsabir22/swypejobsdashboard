import { emptyResume, newId, type JsonResume, type ResumeCertificate, type ResumeProject, type ResumeWork } from "@/lib/resume/schema"

export type ResumeProfileSeed = {
  fullName?: string | null
  email?: string | null
  bio?: string | null
  university?: string | null
  degree?: string | null
  graduationYear?: number | string | null
  skills?: string[] | null
  linkedinUrl?: string | null
  githubUrl?: string | null
  portfolioUrl?: string | null
  /** From student_profiles career history (lib/profile/career.ts). */
  work?: ResumeWork[] | null
  projects?: ResumeProject[] | null
  certificates?: ResumeCertificate[] | null
}

function stripWork(rows: ResumeWork[] | null | undefined): ResumeWork[] {
  return (rows || []).map((w) => ({
    id: w.id || newId(),
    name: w.name,
    position: w.position,
    startDate: w.startDate,
    endDate: w.endDate,
    summary: w.summary,
    highlights: w.highlights || [],
  }))
}

export function resumeFromProfile(seed: ResumeProfileSeed): JsonResume {
  const doc = emptyResume()
  doc.basics.name = seed.fullName?.trim() || ""
  doc.basics.email = seed.email?.trim() || undefined
  doc.basics.summary = seed.bio?.trim() || undefined
  doc.basics.url = seed.portfolioUrl?.trim() || undefined
  doc.basics.label = seed.degree?.trim() || undefined
  const profiles = [
    seed.linkedinUrl?.trim() && { network: "LinkedIn", url: seed.linkedinUrl.trim() },
    seed.githubUrl?.trim() && { network: "GitHub", url: seed.githubUrl.trim() },
    seed.portfolioUrl?.trim() && { network: "Portfolio", url: seed.portfolioUrl.trim() },
  ].filter(Boolean) as { network: string; url: string }[]
  doc.basics.profiles = profiles
  if (seed.university?.trim() || seed.degree?.trim()) {
    doc.education = [
      {
        id: newId(),
        institution: seed.university?.trim() || "",
        studyType: seed.degree?.trim() || undefined,
        endDate: seed.graduationYear ? String(seed.graduationYear) : undefined,
      },
    ]
  }
  doc.skills = (seed.skills || []).filter(Boolean).map((name) => ({ name }))
  doc.work = stripWork(seed.work)
  doc.projects = (seed.projects || []).map((p) => ({ ...p, id: p.id || newId(), highlights: p.highlights || [] }))
  doc.certificates = (seed.certificates || []).map((c) => ({ ...c, id: c.id || newId() }))
  return doc
}

export function mergeResumeWithProfile(doc: JsonResume, seed: ResumeProfileSeed): JsonResume {
  const next = { ...doc, basics: { ...doc.basics } }
  if (!next.basics.name && seed.fullName) next.basics.name = seed.fullName
  if (!next.basics.email && seed.email) next.basics.email = seed.email
  if (!next.basics.summary && seed.bio) next.basics.summary = seed.bio
  if (!next.basics.url && seed.portfolioUrl) next.basics.url = seed.portfolioUrl
  if (!next.basics.label && seed.degree) next.basics.label = seed.degree
  if (!next.education.length && (seed.university || seed.degree)) {
    next.education = resumeFromProfile(seed).education
  }
  if (!next.skills.length && seed.skills?.length) {
    next.skills = seed.skills.filter(Boolean).map((name) => ({ name }))
  }
  if (!next.work.length && seed.work?.length) next.work = stripWork(seed.work)
  if (!next.projects.length && seed.projects?.length) next.projects = resumeFromProfile(seed).projects
  if (!next.certificates.length && seed.certificates?.length) next.certificates = resumeFromProfile(seed).certificates
  const existing = new Set((next.basics.profiles || []).map((p) => p.url))
  const extras = resumeFromProfile(seed).basics.profiles || []
  next.basics.profiles = [...(next.basics.profiles || []), ...extras.filter((p) => p.url && !existing.has(p.url))]
  return next
}
