import {
  ANNOUNCEMENT_AUDIENCE_GROUPS,
  parseAnnouncementAudience,
  serializeAnnouncementAudience,
  type AnnouncementAudienceGroup,
} from "@/lib/campus/announcement-audience"

export type EventFormat = "virtual" | "onsite"

export type EventAudienceTarget = {
  id: string
  name: string
  kind: "person" | "company"
}

export type EventMeta = {
  format: EventFormat
  audiences: AnnouncementAudienceGroup[]
  groupIds: string[]
  targets: EventAudienceTarget[]
  meetLink?: string | null
  calendarHtmlLink?: string | null
}

const META_RE = /<!--swype-event:([\s\S]*?)-->/

export function defaultEventMeta(): EventMeta {
  return {
    format: "onsite",
    audiences: ["students"],
    groupIds: [],
    targets: [],
    meetLink: null,
    calendarHtmlLink: null,
  }
}

export function encodeEventSummary(description: string, meta: EventMeta) {
  const payload: EventMeta = {
    format: meta.format === "virtual" ? "virtual" : "onsite",
    audiences: parseAnnouncementAudience(serializeAnnouncementAudience(meta.audiences)),
    groupIds: [...new Set(meta.groupIds.filter(Boolean))],
    targets: meta.targets
      .filter((row) => row.id && row.name)
      .map((row) => ({
        id: row.id,
        name: row.name,
        kind: row.kind === "company" ? "company" : "person",
      })),
    meetLink: meta.meetLink || null,
    calendarHtmlLink: meta.calendarHtmlLink || null,
  }
  const body = description.trim()
  return `<!--swype-event:${JSON.stringify(payload)}-->${body ? `\n${body}` : ""}`
}

export function parseEventSummary(summary: string | null | undefined): { description: string; meta: EventMeta } {
  const raw = summary || ""
  const match = raw.match(META_RE)
  if (!match) {
    return { description: raw.trim(), meta: defaultEventMeta() }
  }
  let meta = defaultEventMeta()
  try {
    const parsed = JSON.parse(match[1] || "{}") as Partial<EventMeta>
    meta = {
      format: parsed.format === "virtual" ? "virtual" : "onsite",
      audiences: Array.isArray(parsed.audiences)
        ? ANNOUNCEMENT_AUDIENCE_GROUPS.filter((group) => parsed.audiences!.includes(group))
        : ["students"],
      groupIds: Array.isArray(parsed.groupIds) ? parsed.groupIds.filter((id): id is string => typeof id === "string") : [],
      targets: Array.isArray(parsed.targets)
        ? parsed.targets
            .filter((row): row is EventAudienceTarget => Boolean(row && typeof row === "object" && (row as EventAudienceTarget).id))
            .map((row) => ({
              id: String(row.id),
              name: String(row.name || "Invitee"),
              kind: row.kind === "company" ? "company" : "person",
            }))
        : [],
      meetLink: typeof parsed.meetLink === "string" ? parsed.meetLink : null,
      calendarHtmlLink: typeof parsed.calendarHtmlLink === "string" ? parsed.calendarHtmlLink : null,
    }
    if (!meta.audiences.length) meta.audiences = ["students"]
  } catch {
    /* keep defaults */
  }
  const description = raw.replace(META_RE, "").trim()
  return { description, meta }
}

export function eventVisibleToViewer(
  summary: string | null | undefined,
  viewer: { group: AnnouncementAudienceGroup; userId?: string | null }
) {
  const { meta } = parseEventSummary(summary)
  if (meta.targets.some((row) => row.id === viewer.userId)) return true
  return meta.audiences.includes(viewer.group)
}

export function eventFormatLabel(format: EventFormat) {
  return format === "virtual" ? "Virtual" : "On-site"
}
