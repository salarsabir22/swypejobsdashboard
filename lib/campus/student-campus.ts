import { parseAcademicHistory, primaryAcademicFields } from "@/lib/profile/academics"
import { IOBM_SHORT_NAME, IOBM_UNIVERSITY_NAME } from "@/lib/sso/iobm"
import { sameCampus } from "@/lib/jobs/curation"

export function canonicalizeUniversity(name: string | null | undefined) {
  const value = name?.trim() || ""
  if (!value) return ""
  if (value.toLowerCase().includes("iobm") || value.toLowerCase().includes("institute of business management")) {
    return IOBM_UNIVERSITY_NAME
  }
  return value
}

export function careerOfficeTitle(university: string | null | undefined) {
  const name = university?.trim()
  if (!name) return "Your career office"
  if (sameCampus(name, IOBM_UNIVERSITY_NAME) || name.toLowerCase().includes("iobm")) {
    return `${IOBM_SHORT_NAME} Career Development Center`
  }
  return `${name} career office`
}

export async function readStudentCampusMembership(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: { from: (table: string) => any },
  user: { id: string; user_metadata?: Record<string, unknown> | null }
) {
  type MembershipRow = {
    university?: string | null
    is_alumni?: boolean | null
    academic_history?: unknown
  }
  let row: MembershipRow = {}
  for (const columns of ["university", "university, academic_history", "university, is_alumni, academic_history"]) {
    const { data, error } = await supabase.from("student_profiles").select(columns).eq("id", user.id).maybeSingle()
    if (error || !data || typeof data !== "object") continue
    row = { ...row, ...(data as MembershipRow) }
    if (row.university) break
  }
  const alumni = await supabase.from("student_profiles").select("is_alumni").eq("id", user.id).maybeSingle()
  if (!alumni.error && alumni.data && typeof alumni.data === "object") {
    row = { ...row, is_alumni: (alumni.data as MembershipRow).is_alumni }
  }

  const history = parseAcademicHistory(row?.academic_history)
  const fromHistory = primaryAcademicFields(history)?.university?.trim() || ""
  const fromRow = row?.university?.trim() || ""
  const fromMeta =
    typeof user.user_metadata?.university === "string" ? user.user_metadata.university.trim() : ""
  const ssoIobm =
    user.user_metadata?.sso === "iobm" ||
    (typeof fromMeta === "string" && fromMeta.toLowerCase().includes("iobm"))
  const raw = fromRow || fromHistory || fromMeta || (ssoIobm ? IOBM_UNIVERSITY_NAME : "") || ""
  const university = canonicalizeUniversity(raw) || null
  const isAlumni = row?.is_alumni === true || user.user_metadata?.alumni === true

  if (university && university !== fromRow) {
    const payload = { id: user.id, university }
    const updated = await supabase.from("student_profiles").update({ university }).eq("id", user.id).select("id")
    if (updated.error || !updated.data?.length) {
      await supabase.from("student_profiles").upsert(payload, { onConflict: "id" })
    }
  }

  return { university: university || null, isAlumni }
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
