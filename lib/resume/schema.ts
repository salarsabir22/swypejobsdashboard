/** JSON Resume subset — https://jsonresume.org/schema */

export const JSON_RESUME_SCHEMA =
  "https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json"

export type ResumeLocation = {
  city?: string
  region?: string
}

export type ResumeProfile = {
  network: string
  url: string
}

export type ResumeBasics = {
  name: string
  label?: string
  email?: string
  phone?: string
  url?: string
  summary?: string
  location?: ResumeLocation
  profiles?: ResumeProfile[]
}

export type ResumeWork = {
  id: string
  name: string
  position: string
  startDate?: string
  endDate?: string
  summary?: string
  highlights?: string[]
}

export type ResumeEducation = {
  id: string
  institution: string
  area?: string
  studyType?: string
  endDate?: string
  score?: string
}

export type ResumeProject = {
  id: string
  name: string
  description?: string
  url?: string
  highlights?: string[]
}

export type ResumeSkill = {
  name: string
  keywords?: string[]
}

export type ResumeLanguage = {
  id: string
  language: string
  fluency?: string
}

export type ResumeCertificate = {
  id: string
  name: string
  issuer?: string
  date?: string
}

export type ResumeAward = {
  id: string
  title: string
  date?: string
  summary?: string
}

export type JsonResume = {
  $schema?: string
  basics: ResumeBasics
  work: ResumeWork[]
  education: ResumeEducation[]
  skills: ResumeSkill[]
  projects: ResumeProject[]
  languages: ResumeLanguage[]
  certificates: ResumeCertificate[]
  awards: ResumeAward[]
}

export type CoverLetter = {
  id: string
  title: string
  company: string
  role: string
  body: string
  updatedAt: string
}

export type ResumeRecord = {
  id: string
  title: string
  updatedAt: string
  isProfile: boolean
  resume: JsonResume
}

export function newId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID()
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function emptyResume(): JsonResume {
  return {
    $schema: JSON_RESUME_SCHEMA,
    basics: { name: "", summary: "", profiles: [] },
    work: [],
    education: [],
    skills: [],
    projects: [],
    languages: [],
    certificates: [],
    awards: [],
  }
}

export function moveById<T extends { id: string }>(items: T[], id: string, direction: -1 | 1): T[] {
  const index = items.findIndex((item) => item.id === id)
  const nextIndex = index + direction
  if (index < 0 || nextIndex < 0 || nextIndex >= items.length) return items
  const next = [...items]
  const [row] = next.splice(index, 1)
  next.splice(nextIndex, 0, row)
  return next
}

function asString(value: unknown) {
  return typeof value === "string" ? value : ""
}

function asList(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

export function parseResume(raw: unknown): JsonResume {
  const base = emptyResume()
  if (!raw || typeof raw !== "object") return base
  const data = raw as Record<string, unknown>
  const basics = data.basics && typeof data.basics === "object" ? (data.basics as Record<string, unknown>) : {}
  const location =
    basics.location && typeof basics.location === "object" ? (basics.location as Record<string, unknown>) : {}
  return {
    $schema: JSON_RESUME_SCHEMA,
    basics: {
      name: asString(basics.name),
      label: asString(basics.label) || undefined,
      email: asString(basics.email) || undefined,
      phone: asString(basics.phone) || undefined,
      url: asString(basics.url) || undefined,
      summary: asString(basics.summary) || undefined,
      location: {
        city: asString(location.city) || undefined,
        region: asString(location.region) || undefined,
      },
      profiles: asList(basics.profiles)
        .map((item) => {
          if (!item || typeof item !== "object") return null
          const row = item as Record<string, unknown>
          const network = asString(row.network)
          const url = asString(row.url)
          if (!network && !url) return null
          return { network: network || "Link", url }
        })
        .filter(Boolean) as ResumeProfile[],
    },
    work: asList(data.work).map((item, index) => {
      const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {}
      return {
        id: asString(row.id) || `work-${index}`,
        name: asString(row.name),
        position: asString(row.position),
        startDate: asString(row.startDate) || undefined,
        endDate: asString(row.endDate) || undefined,
        summary: asString(row.summary) || undefined,
        highlights: asList(row.highlights).map(asString).filter(Boolean),
      }
    }),
    education: asList(data.education).map((item, index) => {
      const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {}
      return {
        id: asString(row.id) || `edu-${index}`,
        institution: asString(row.institution),
        area: asString(row.area) || undefined,
        studyType: asString(row.studyType) || undefined,
        endDate: asString(row.endDate) || undefined,
        score: asString(row.score) || undefined,
      }
    }),
    skills: asList(data.skills)
      .map((item) => {
        if (typeof item === "string") return { name: item }
        if (!item || typeof item !== "object") return null
        const row = item as Record<string, unknown>
        const name = asString(row.name)
        if (!name) return null
        return { name, keywords: asList(row.keywords).map(asString).filter(Boolean) }
      })
      .filter(Boolean) as ResumeSkill[],
    projects: asList(data.projects).map((item, index) => {
      const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {}
      return {
        id: asString(row.id) || `proj-${index}`,
        name: asString(row.name),
        description: asString(row.description) || undefined,
        url: asString(row.url) || undefined,
        highlights: asList(row.highlights).map(asString).filter(Boolean),
      }
    }),
    languages: asList(data.languages).map((item, index) => {
      const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {}
      return {
        id: asString(row.id) || `lang-${index}`,
        language: asString(row.language),
        fluency: asString(row.fluency) || undefined,
      }
    }),
    certificates: asList(data.certificates).map((item, index) => {
      const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {}
      return {
        id: asString(row.id) || `cert-${index}`,
        name: asString(row.name),
        issuer: asString(row.issuer) || undefined,
        date: asString(row.date) || undefined,
      }
    }),
    awards: asList(data.awards).map((item, index) => {
      const row = item && typeof item === "object" ? (item as Record<string, unknown>) : {}
      return {
        id: asString(row.id) || `award-${index}`,
        title: asString(row.title),
        date: asString(row.date) || undefined,
        summary: asString(row.summary) || undefined,
      }
    }),
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null
}

export function newResumeRecord(resume: JsonResume, partial?: Partial<Pick<ResumeRecord, "id" | "title" | "isProfile">>): ResumeRecord {
  const title =
    partial?.title?.trim() ||
    resume.basics.label?.trim() ||
    (resume.basics.name?.trim() ? `${resume.basics.name.trim()} resume` : "Resume")
  return {
    id: partial?.id || newId(),
    title,
    updatedAt: new Date().toISOString(),
    isProfile: Boolean(partial?.isProfile),
    resume,
  }
}

function parseResumeRecord(item: unknown, index: number): ResumeRecord | null {
  const row = asRecord(item)
  if (!row) return null
  const nested = row.resume
  const resume = parseResume(nested && typeof nested === "object" ? nested : row.basics ? row : null)
  const empty =
    !resume.basics.name &&
    !resume.work.length &&
    !resume.education.length &&
    !resume.skills.length &&
    !resume.projects.length &&
    !resume.languages.length &&
    !resume.certificates.length &&
    !resume.awards.length &&
    !resume.basics.summary
  if (empty && !asString(row.title) && !asString(row.id)) return null
  return {
    id: asString(row.id) || `resume-${index}`,
    title: asString(row.title) || resume.basics.label || resume.basics.name || "Resume",
    updatedAt: asString(row.updatedAt) || new Date().toISOString(),
    isProfile: row.isProfile === true,
    resume,
  }
}

/** Accepts a single JSON Resume, `{ documents: [...] }`, or an array of records. */
export function parseResumeLibrary(raw: unknown): ResumeRecord[] {
  if (!raw) return []
  if (Array.isArray(raw)) {
    return raw.map(parseResumeRecord).filter(Boolean) as ResumeRecord[]
  }
  const row = asRecord(raw)
  if (!row) return []
  if (Array.isArray(row.documents)) {
    return row.documents.map(parseResumeRecord).filter(Boolean) as ResumeRecord[]
  }
  if (row.basics) {
    const resume = parseResume(row)
    return [
      {
        id: "primary",
        title: resume.basics.label || resume.basics.name || "Resume",
        updatedAt: new Date().toISOString(),
        isProfile: true,
        resume,
      },
    ]
  }
  return []
}

export function serializeResumeLibrary(documents: ResumeRecord[]) {
  return {
    documents: documents.map((doc) => ({
      id: doc.id,
      title: doc.title,
      updatedAt: doc.updatedAt,
      isProfile: doc.isProfile,
      resume: doc.resume,
    })),
  }
}

export function parseCoverLetters(raw: unknown): CoverLetter[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item, index) => {
      if (!item || typeof item !== "object") return null
      const row = item as Record<string, unknown>
      const body = asString(row.body)
      if (!body && !asString(row.company) && !asString(row.role)) return null
      return {
        id: asString(row.id) || `letter-${index}`,
        title: asString(row.title) || asString(row.role) || "Cover letter",
        company: asString(row.company),
        role: asString(row.role),
        body,
        updatedAt: asString(row.updatedAt) || new Date().toISOString(),
      }
    })
    .filter(Boolean) as CoverLetter[]
}

export function toJsonResumeFile(doc: JsonResume) {
  return {
    $schema: JSON_RESUME_SCHEMA,
    basics: {
      name: doc.basics.name,
      label: doc.basics.label || undefined,
      email: doc.basics.email || undefined,
      phone: doc.basics.phone || undefined,
      url: doc.basics.url || undefined,
      summary: doc.basics.summary || undefined,
      location: {
        city: doc.basics.location?.city || undefined,
        region: doc.basics.location?.region || undefined,
      },
      profiles: (doc.basics.profiles || []).filter((p) => p.url),
    },
    work: doc.work.map(({ id: _id, ...rest }) => rest),
    education: doc.education.map(({ id: _id, ...rest }) => rest),
    skills: doc.skills.map((s) => ({ name: s.name, keywords: s.keywords?.length ? s.keywords : undefined })),
    projects: doc.projects.map(({ id: _id, ...rest }) => rest),
    languages: doc.languages
      .filter((row) => row.language)
      .map(({ id: _id, ...rest }) => rest),
    certificates: doc.certificates
      .filter((row) => row.name)
      .map(({ id: _id, ...rest }) => rest),
    awards: doc.awards
      .filter((row) => row.title)
      .map(({ id: _id, ...rest }) => rest),
  }
}
