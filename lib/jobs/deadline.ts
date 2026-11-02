/** Helpers for `jobs.application_deadline` (a DATE column, stored as `YYYY-MM-DD`). */

const DAY_MS = 86_400_000

/** Today's date as `YYYY-MM-DD` in local time. */
export function todayIso() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function parseDeadline(value: unknown): string | null {
  if (typeof value !== "string") return null
  const m = value.match(/^(\d{4}-\d{2}-\d{2})/)
  return m ? m[1] : null
}

/** Days from today until the deadline (inclusive of the deadline day). Negative when passed. */
export function daysUntilDeadline(deadline: string | null | undefined) {
  const iso = parseDeadline(deadline)
  if (!iso) return null
  const [y, m, d] = iso.split("-").map(Number)
  const end = new Date(y, m - 1, d, 23, 59, 59, 999).getTime()
  return Math.ceil((end - Date.now()) / DAY_MS)
}

export function deadlinePassed(deadline: string | null | undefined) {
  const days = daysUntilDeadline(deadline)
  return days !== null && days <= 0
}

/** Deadline is within `withinDays` days and not yet passed. */
export function deadlineSoon(deadline: string | null | undefined, withinDays = 3) {
  const days = daysUntilDeadline(deadline)
  return days !== null && days > 0 && days <= withinDays
}

export function formatDeadline(deadline: string | null | undefined) {
  const iso = parseDeadline(deadline)
  if (!iso) return null
  const [y, m, d] = iso.split("-").map(Number)
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(y, m - 1, d)
  )
}

/** Short, human label for cards and badges. `null` when there is no deadline. */
export function deadlineLabel(deadline: string | null | undefined) {
  const days = daysUntilDeadline(deadline)
  if (days === null) return null
  if (days <= 0) return "Applications closed"
  if (days === 1) return "Closes today"
  if (days <= 7) return `Closes in ${days} days`
  return `Apply by ${formatDeadline(deadline)}`
}

/**
 * PostgREST filter string that keeps jobs with no deadline or a deadline that is today or later.
 * Usage: `query.or(openDeadlineFilter())`
 */
export function openDeadlineFilter() {
  return `application_deadline.is.null,application_deadline.gte.${todayIso()}`
}
