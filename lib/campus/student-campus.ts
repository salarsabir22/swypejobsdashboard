import { IOBM_SHORT_NAME, IOBM_UNIVERSITY_NAME } from "@/lib/sso/iobm"
import { sameCampus } from "@/lib/jobs/curation"

export function careerOfficeTitle(university: string | null | undefined) {
  const name = university?.trim()
  if (!name) return "Your career office"
  if (sameCampus(name, IOBM_UNIVERSITY_NAME) || name.toLowerCase().includes("iobm")) {
    return `${IOBM_SHORT_NAME} Career Development Center`
  }
  return `${name} career office`
}

export function belongsToCampus(
  rowUniversity: string | null | undefined,
  studentUniversity: string | null | undefined
) {
  if (!studentUniversity) return !rowUniversity
  if (!rowUniversity) return true
  return sameCampus(rowUniversity, studentUniversity)
}

export type StudentCampusEvent = {
  id: string
  title: string
  kind: string | null
  summary: string | null
  location: string | null
  starts_at: string | null
}

export type StudentCampusAnnouncement = {
  id: string
  title: string
  body: string
  audience: string | null
  requires_ack: boolean | null
}

export async function loadStudentCampus(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: { from: (table: string) => any },
  opts: { userId: string; university: string | null; isAlumni: boolean }
) {
  const audience = opts.isAlumni ? "alumni" : "students"
  const [eventsRes, announcementsRes] = await Promise.all([
    supabase
      .from("campus_events")
      .select("id, title, kind, summary, location, starts_at, university")
      .order("starts_at", { ascending: true })
      .limit(24),
    supabase
      .from("campus_announcements")
      .select("id, title, body, audience, requires_ack, expires_at, university")
      .order("created_at", { ascending: false })
      .limit(24),
  ])

  const events = ((eventsRes.error ? [] : eventsRes.data) || [])
    .filter((row: { university?: string | null; starts_at?: string | null }) => {
      if (!belongsToCampus(row.university, opts.university)) return false
      if (row.starts_at && new Date(row.starts_at).getTime() < Date.now() - 6 * 60 * 60 * 1000) return false
      return true
    })
    .slice(0, 4) as StudentCampusEvent[]

  const announcements = ((announcementsRes.error ? [] : announcementsRes.data) || [])
    .filter((row: { university?: string | null; audience?: string | null; expires_at?: string | null }) => {
      if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) return false
      if (!belongsToCampus(row.university, opts.university)) return false
      return row.audience === "all" || row.audience === audience
    })
    .slice(0, 4) as StudentCampusAnnouncement[]

  return {
    title: careerOfficeTitle(opts.university),
    university: opts.university,
    events,
    announcements,
  }
}
