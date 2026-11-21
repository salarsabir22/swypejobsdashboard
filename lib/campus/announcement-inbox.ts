import { announcementTargetsGroup, type AnnouncementAudienceGroup } from "@/lib/campus/announcement-audience"
import { belongsToCampus, readStudentCampusMembership } from "@/lib/campus/student-campus"

/** One campus notice as a student sees it. */
export type StudentAnnouncementRow = {
  id: string
  title: string
  body: string
  audience: string | null
  requires_ack: boolean | null
  expires_at: string | null
  created_at: string | null
  university: string | null
}

const ANNOUNCEMENT_COLUMNS = "id, title, body, audience, requires_ack, expires_at, created_at, university"

export type AnnouncementInbox = {
  campusConnected: boolean
  university: string | null
  announcements: StudentAnnouncementRow[]
  acked: Set<string>
  /** Not opened or acknowledged yet — drives the bell and nav badges. */
  pending: number
  /** Requires an explicit acknowledgement and is still outstanding. */
  awaitingReply: number
}

const EMPTY: AnnouncementInbox = {
  campusConnected: false,
  university: null,
  announcements: [],
  acked: new Set<string>(),
  pending: 0,
  awaitingReply: 0,
}

/**
 * Notices targeted at this student. "Read" is tracked in `announcement_acks`
 * (the only per-user receipt table available), so opening the announcements page
 * clears plain notices while required ones stay until acknowledged.
 */
export async function loadAnnouncementInbox(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: { from: (table: string) => any },
  user: { id: string; user_metadata?: Record<string, unknown> | null },
  opts: { limit?: number } = {}
): Promise<AnnouncementInbox> {
  const membership = await readStudentCampusMembership(supabase, user)
  const university = membership.university
  const campusConnected = membership.campusConnected !== false
  if (!university || !campusConnected) {
    return { ...EMPTY, university, campusConnected: false }
  }

  const [rowsRes, acksRes] = await Promise.all([
    supabase
      .from("campus_announcements")
      .select(ANNOUNCEMENT_COLUMNS)
      .order("created_at", { ascending: false })
      .limit(60),
    supabase.from("announcement_acks").select("announcement_id").eq("user_id", user.id).limit(200),
  ])

  const acked = new Set<string>(
    ((acksRes.error ? [] : acksRes.data) || []).map((row: { announcement_id: string }) => row.announcement_id)
  )
  const viewerGroup: AnnouncementAudienceGroup = membership.isAlumni ? "alumni" : "students"
  const announcements = ((rowsRes.error ? [] : rowsRes.data) || [])
    .filter(
      (row: { university?: string | null; audience?: string | null; expires_at?: string | null }) => {
        if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) return false
        if (!belongsToCampus(row.university, university)) return false
        return announcementTargetsGroup(row.audience, viewerGroup)
      }
    )
    .slice(0, opts.limit ?? 40) as StudentAnnouncementRow[]

  return {
    campusConnected: true,
    university,
    announcements,
    acked,
    pending: announcements.filter((row) => !acked.has(row.id)).length,
    awaitingReply: announcements.filter((row) => row.requires_ack && !acked.has(row.id)).length,
  }
}
