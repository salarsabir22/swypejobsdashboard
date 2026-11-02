/**
 * Career history stored on student_profiles (work_history, projects, certifications) as JSON arrays.
 * Shapes follow JSON Resume so the Resume Studio can import them directly.
 */

import {
  newId,
  parseResume,
  type ResumeCertificate,
  type ResumeProject,
  type ResumeWork,
} from "@/lib/resume/schema"

export type WorkKind = "job" | "internship"

export type WorkEntry = ResumeWork & {
  /** Internship vs. job; defaults to job. */
  kind: WorkKind
  /** Still working here. Equivalent to an empty endDate. */
  current: boolean
}

export type ProjectEntry = ResumeProject
export type CertificationEntry = ResumeCertificate

export type CareerHistory = {
  work: WorkEntry[]
  projects: ProjectEntry[]
  certifications: CertificationEntry[]
}

export function parseWorkHistory(raw: unknown): WorkEntry[] {
  const list = Array.isArray(raw) ? raw : []
  const parsed = parseResume({ work: list }).work
  return parsed
    .map((row, index) => {
      const source = (list[index] && typeof list[index] === "object" ? list[index] : {}) as Record<string, unknown>
      const kind: WorkKind = source.kind === "internship" ? "internship" : "job"
      const current = source.current === true || (!row.endDate && Boolean(row.startDate))
      return { ...row, kind, current, endDate: current ? undefined : row.endDate }
    })
    .filter((row) => row.name.trim() || row.position.trim())
}

export function parseProjects(raw: unknown): ProjectEntry[] {
  return parseResume({ projects: Array.isArray(raw) ? raw : [] }).projects.filter((p) => p.name.trim())
}

export function parseCertifications(raw: unknown): CertificationEntry[] {
  return parseResume({ certificates: Array.isArray(raw) ? raw : [] }).certificates.filter((c) => c.name.trim())
}

export function parseCareerHistory(row: {
  work_history?: unknown
  projects?: unknown
  certifications?: unknown
} | null | undefined): CareerHistory {
  return {
    work: parseWorkHistory(row?.work_history),
    projects: parseProjects(row?.projects),
    certifications: parseCertifications(row?.certifications),
  }
}

export function emptyWork(kind: WorkKind = "job"): WorkEntry {
  return { id: newId(), name: "", position: "", kind, current: false, highlights: [] }
}

export function emptyProject(): ProjectEntry {
  return { id: newId(), name: "", highlights: [] }
}

export function emptyCertification(): CertificationEntry {
  return { id: newId(), name: "" }
}

/** Strip UI-only fields and empty rows before writing to the DB. */
export function serializeCareerHistory(history: CareerHistory) {
  return {
    work_history: history.work
      .filter((w) => w.name.trim() || w.position.trim())
      .map((w) => ({
        id: w.id,
        kind: w.kind,
        name: w.name.trim(),
        position: w.position.trim(),
        startDate: w.startDate || undefined,
        endDate: w.current ? undefined : w.endDate || undefined,
        current: w.current,
        summary: w.summary?.trim() || undefined,
        highlights: (w.highlights || []).map((h) => h.trim()).filter(Boolean),
      })),
    projects: history.projects
      .filter((p) => p.name.trim())
      .map((p) => ({
        id: p.id,
        name: p.name.trim(),
        description: p.description?.trim() || undefined,
        url: p.url?.trim() || undefined,
        highlights: (p.highlights || []).map((h) => h.trim()).filter(Boolean),
      })),
    certifications: history.certifications
      .filter((c) => c.name.trim())
      .map((c) => ({
        id: c.id,
        name: c.name.trim(),
        issuer: c.issuer?.trim() || undefined,
        date: c.date || undefined,
      })),
  }
}

/** "Jan 2024 – Present" style label from YYYY-MM or YYYY strings. */
export function formatWorkDates(entry: { startDate?: string; endDate?: string; current?: boolean }) {
  const fmt = (value?: string) => {
    if (!value) return null
    const m = value.match(/^(\d{4})(?:-(\d{2}))?/)
    if (!m) return value
    if (!m[2]) return m[1]
    const d = new Date(Number(m[1]), Number(m[2]) - 1, 1)
    return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(d)
  }
  const start = fmt(entry.startDate)
  const end = entry.current ? "Present" : fmt(entry.endDate)
  if (start && end) return `${start} – ${end}`
  return start || end || ""
}

/** Most recent current role, used for alumni "current employer" display. */
export function currentRole(work: WorkEntry[]) {
  return work.find((w) => w.current && w.kind === "job") || work.find((w) => w.current) || null
}
