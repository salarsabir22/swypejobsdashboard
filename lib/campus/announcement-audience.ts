/** Campus announcement audience targeting. Stored as `all` or comma-separated groups. */

export const ANNOUNCEMENT_AUDIENCE_GROUPS = ["students", "alumni", "employers"] as const

export type AnnouncementAudienceGroup = (typeof ANNOUNCEMENT_AUDIENCE_GROUPS)[number]

export const ANNOUNCEMENT_AUDIENCE_OPTIONS: readonly {
  id: AnnouncementAudienceGroup
  label: string
  hint: string
}[] = [
  { id: "students", label: "Students", hint: "Current enrolled students" },
  { id: "alumni", label: "Alumni", hint: "Graduates on the campus portal" },
  { id: "employers", label: "Employers", hint: "Partner employers and recruiters" },
] as const

const GROUP_SET = new Set<string>(ANNOUNCEMENT_AUDIENCE_GROUPS)

function isAudienceGroup(value: string): value is AnnouncementAudienceGroup {
  return GROUP_SET.has(value)
}

/** Normalize whatever is stored in `campus_announcements.audience`. */
export function parseAnnouncementAudience(value: string | null | undefined): AnnouncementAudienceGroup[] {
  if (!value?.trim()) return []
  const raw = value.trim().toLowerCase()
  if (raw === "all" || raw === "everyone") return [...ANNOUNCEMENT_AUDIENCE_GROUPS]
  if (raw.startsWith("[")) {
    try {
      const parsed = JSON.parse(value) as unknown
      if (Array.isArray(parsed)) {
        return ANNOUNCEMENT_AUDIENCE_GROUPS.filter((group) =>
          parsed.some((item) => String(item).trim().toLowerCase() === group)
        )
      }
    } catch {
      /* fall through */
    }
  }
  const parts = raw
    .split(/[,+|]/)
    .map((part) => part.trim())
    .filter(Boolean)
  const selected = new Set<AnnouncementAudienceGroup>()
  for (const part of parts) {
    if (part === "all" || part === "everyone") return [...ANNOUNCEMENT_AUDIENCE_GROUPS]
    if (isAudienceGroup(part)) selected.add(part)
  }
  return ANNOUNCEMENT_AUDIENCE_GROUPS.filter((group) => selected.has(group))
}

/** Persist selection. All three groups collapse to `all` for backwards compatibility. */
export function serializeAnnouncementAudience(groups: readonly string[]): string {
  const selected = ANNOUNCEMENT_AUDIENCE_GROUPS.filter((group) =>
    groups.some((g) => g.trim().toLowerCase() === group)
  )
  if (selected.length === 0) return "students"
  if (selected.length === ANNOUNCEMENT_AUDIENCE_GROUPS.length) return "all"
  return selected.join(",")
}

export function announcementTargetsGroup(
  stored: string | null | undefined,
  viewerGroup: AnnouncementAudienceGroup
) {
  return parseAnnouncementAudience(stored).includes(viewerGroup)
}

export function announcementAudienceLabels(stored: string | null | undefined): string[] {
  const groups = parseAnnouncementAudience(stored)
  if (groups.length === ANNOUNCEMENT_AUDIENCE_GROUPS.length) return ["Everyone"]
  return groups.map((group) => ANNOUNCEMENT_AUDIENCE_OPTIONS.find((opt) => opt.id === group)?.label || group)
}

export function formatAnnouncementAudience(stored: string | null | undefined) {
  return announcementAudienceLabels(stored).join(" · ") || "Audience"
}
