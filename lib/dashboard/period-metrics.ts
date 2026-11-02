/** Count rows whose `created_at` falls in `[fromIso, toIso)`. */
export function countCreatedBetween<T extends { created_at?: string | null }>(
  rows: T[],
  fromIso: string,
  toIso?: string,
) {
  let n = 0
  for (const row of rows) {
    const at = row.created_at
    if (!at || at < fromIso) continue
    if (toIso && at >= toIso) continue
    n += 1
  }
  return n
}

/** Week-over-week copy for KPI hints - values are counts in each window */
export function weekOverWeekHint(currentWindow: number, priorWindow: number): string | null {
  if (currentWindow === 0 && priorWindow === 0) return null
  if (priorWindow === 0 && currentWindow > 0) return "First activity this week"
  const delta = currentWindow - priorWindow
  const pct = Math.round((delta / priorWindow) * 100)
  if (delta === 0) return "Flat vs prior week"
  if (delta > 0) return `↑ ${pct}% vs prior week`
  return `↓ ${Math.abs(pct)}% vs prior week`
}

export function matchRatePercent(matches: number, applications: number): number {
  if (applications <= 0) return 0
  return Math.min(100, Math.round((matches / applications) * 100))
}
