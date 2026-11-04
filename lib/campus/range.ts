export const CAMPUS_RANGES = ["day", "week", "month", "quarter", "year", "all"] as const

export type CampusRangeId = (typeof CAMPUS_RANGES)[number]

export type CampusRange = {
  id: CampusRangeId
  label: string
  shortLabel: string
  days: number | null
}

export const CAMPUS_RANGE_OPTIONS: CampusRange[] = [
  { id: "day", label: "1 day", shortLabel: "Today", days: 1 },
  { id: "week", label: "1 week", shortLabel: "This week", days: 7 },
  { id: "month", label: "1 month", shortLabel: "This month", days: 30 },
  { id: "quarter", label: "Quarter", shortLabel: "This quarter", days: 90 },
  { id: "year", label: "Year", shortLabel: "This year", days: 365 },
  { id: "all", label: "All time", shortLabel: "All time", days: null },
]

export function isCampusRangeId(value: unknown): value is CampusRangeId {
  return typeof value === "string" && (CAMPUS_RANGES as readonly string[]).includes(value)
}

export function parseCampusRange(value: string | string[] | null | undefined): CampusRange {
  const raw = Array.isArray(value) ? value[0] : value
  return CAMPUS_RANGE_OPTIONS.find((option) => option.id === raw) || CAMPUS_RANGE_OPTIONS[2]
}

export function campusRangeSince(range: CampusRange, now = Date.now()) {
  if (range.days == null) return null
  return new Date(now - range.days * 86400000)
}

export function inCampusRange(iso: string | null | undefined, range: CampusRange, now = Date.now()) {
  if (range.days == null) return Boolean(iso)
  if (!iso) return false
  return new Date(iso).getTime() >= now - range.days * 86400000
}
