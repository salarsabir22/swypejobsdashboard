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
