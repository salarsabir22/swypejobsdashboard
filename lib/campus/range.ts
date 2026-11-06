export const CAMPUS_RANGES = ["day", "week", "month", "quarter", "year", "all", "custom"] as const

export type CampusRangeId = (typeof CAMPUS_RANGES)[number]

export type CampusRange = {
  id: CampusRangeId
  label: string
  shortLabel: string
  /** Inclusive length in days for relative or custom windows; null = all time. */
  days: number | null
  /** Inclusive start (YYYY-MM-DD) when id is custom. */
  from?: string | null
  /** Inclusive end (YYYY-MM-DD) when id is custom. */
  to?: string | null
}

export const CAMPUS_RANGE_OPTIONS: CampusRange[] = [
  { id: "day", label: "1 day", shortLabel: "Today", days: 1 },
  { id: "week", label: "1 week", shortLabel: "This week", days: 7 },
  { id: "month", label: "1 month", shortLabel: "This month", days: 30 },
  { id: "quarter", label: "Quarter", shortLabel: "This quarter", days: 90 },
  { id: "year", label: "Year", shortLabel: "This year", days: 365 },
  { id: "all", label: "All time", shortLabel: "All time", days: null },
]

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function firstParam(value: string | string[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export function parseIsoDate(value: string | string[] | null | undefined): string | null {
  const raw = firstParam(value)?.trim()
  if (!raw || !ISO_DATE.test(raw)) return null
  const stamp = Date.parse(`${raw}T12:00:00`)
  if (Number.isNaN(stamp)) return null
  return raw
}

export function todayIso(now = new Date()) {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function inclusiveDayCount(from: string, to: string) {
  const start = Date.parse(`${from}T00:00:00`)
  const end = Date.parse(`${to}T00:00:00`)
  if (Number.isNaN(start) || Number.isNaN(end)) return 1
  return Math.max(1, Math.round((end - start) / 86400000) + 1)
}

function formatDayLabel(iso: string) {
  const [y, m, d] = iso.split("-").map(Number)
  const month = MONTHS_SHORT[(m || 1) - 1] || iso
  return `${month} ${d || 1}${y && y !== new Date().getFullYear() ? `, ${y}` : ""}`
}

export function formatCustomRangeLabel(from: string, to: string) {
  if (from === to) return formatDayLabel(from)
  return `${formatDayLabel(from)} – ${formatDayLabel(to)}`
}

export function isCampusRangeId(value: unknown): value is CampusRangeId {
  return typeof value === "string" && (CAMPUS_RANGES as readonly string[]).includes(value)
}

export type CampusRangeBounds = {
  from?: string | string[] | null
  to?: string | string[] | null
}

/** Build a custom range from absolute dates (swaps if reversed). */
export function customCampusRange(fromInput: string, toInput: string): CampusRange {
  let from = parseIsoDate(fromInput) || todayIso()
  let to = parseIsoDate(toInput) || todayIso()
  if (from > to) [from, to] = [to, from]
  const label = formatCustomRangeLabel(from, to)
  return {
    id: "custom",
    label,
    shortLabel: label,
    days: inclusiveDayCount(from, to),
    from,
    to,
  }
}

/**
 * Parse preset range ids, optional absolute `from`/`to`, or encoded `custom:YYYY-MM-DD:YYYY-MM-DD`.
 * Absolute bounds win over presets.
 */
export function parseCampusRange(
  value: string | string[] | null | undefined = null,
  bounds?: CampusRangeBounds
): CampusRange {
  let from = parseIsoDate(bounds?.from)
  let to = parseIsoDate(bounds?.to)
  const raw = firstParam(value)?.trim() || ""

  if (raw.startsWith("custom:")) {
    const parts = raw.split(":")
    from = parseIsoDate(parts[1]) || from
    to = parseIsoDate(parts[2]) || to
  }

  if (from || to) {
    if (from && !to) to = todayIso()
    if (to && !from) from = to
    return customCampusRange(from!, to!)
  }

  if (raw === "custom") {
    const end = todayIso()
    const startDate = new Date(`${end}T12:00:00`)
    startDate.setDate(startDate.getDate() - 29)
    return customCampusRange(todayIso(startDate), end)
  }

  return CAMPUS_RANGE_OPTIONS.find((option) => option.id === raw) || CAMPUS_RANGE_OPTIONS[2]
}

export function campusRangeSince(range: CampusRange, now = Date.now()) {
  if (range.from) return new Date(`${range.from}T00:00:00`)
  if (range.days == null) return null
  return new Date(now - range.days * 86400000)
}

export function campusRangeEnd(range: CampusRange, now = Date.now()) {
  if (range.to) return new Date(`${range.to}T23:59:59.999`)
  return new Date(now)
}

export function inCampusRange(iso: string | null | undefined, range: CampusRange, now = Date.now()) {
  if (!iso) return false
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return false
  if (range.from && range.to) {
    return t >= Date.parse(`${range.from}T00:00:00`) && t <= Date.parse(`${range.to}T23:59:59.999`)
  }
  if (range.days == null) return true
  return t >= now - range.days * 86400000 && t <= now
}

/** True if iso falls in the last `tailDays` of the selected window (or rolling window). */
export function inCampusRangeTail(
  iso: string | null | undefined,
  range: CampusRange,
  tailDays: number,
  now = Date.now()
) {
  if (!iso) return false
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return false
  if (range.from && range.to) {
    const end = Date.parse(`${range.to}T23:59:59.999`)
    const startBound = Date.parse(`${range.from}T00:00:00`)
    const start = Math.max(startBound, end - Math.max(1, tailDays) * 86400000 + 1)
    return t >= start && t <= end
  }
  const days = Math.min(tailDays, range.days ?? tailDays)
  return t >= now - days * 86400000 && t <= now
}

/** Query params to preserve the active report window across links and exports. */
export function campusRangeQuery(range: Pick<CampusRange, "id" | "from" | "to"> | null | undefined) {
  const query: Record<string, string> = {}
  if (!range) return query
  if (range.id === "custom" && range.from && range.to) {
    query.from = range.from
    query.to = range.to
    return query
  }
  if (range.id && range.id !== "month" && range.id !== "custom") {
    query.range = range.id
  }
  return query
}

export function applyCampusRangeParams(
  params: URLSearchParams,
  range: Pick<CampusRange, "id" | "from" | "to"> | { id: string }
) {
  params.delete("range")
  params.delete("from")
  params.delete("to")
  const next = campusRangeQuery(range as CampusRange)
  for (const [key, value] of Object.entries(next)) params.set(key, value)
  return params
}

/** Campus-wide filter keys that should survive sidebar / top-nav navigation. */
export const CAMPUS_FILTER_KEYS = ["campus", "range", "from", "to"] as const

export function campusFilterParams(source: URLSearchParams | Record<string, string | null | undefined> | null | undefined) {
  const out = new URLSearchParams()
  if (!source) return out
  for (const key of CAMPUS_FILTER_KEYS) {
    const value = source instanceof URLSearchParams ? source.get(key) : source[key]
    if (value?.trim()) out.set(key, value.trim())
  }
  return out
}

/** Merge campus/range/from/to onto an href without clobbering existing query keys (e.g. kind=alumni). */
export function withCampusFilters(
  href: string,
  source: URLSearchParams | Record<string, string | null | undefined> | null | undefined
) {
  if (!href.startsWith("/campus")) return href
  const filters = campusFilterParams(source)
  if (![...filters.keys()].length) return href
  const qIndex = href.indexOf("?")
  const path = qIndex >= 0 ? href.slice(0, qIndex) : href
  const merged = new URLSearchParams(qIndex >= 0 ? href.slice(qIndex + 1) : "")
  for (const [key, value] of filters.entries()) {
    if (!merged.has(key)) merged.set(key, value)
  }
  const qs = merged.toString()
  return qs ? `${path}?${qs}` : path
}
