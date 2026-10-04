/** UTC calendar days `YYYY-MM-DD`, oldest → newest */
export function daysLastN(n: number): string[] {
  const out: string[] = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i))
    out.push(d.toISOString().slice(0, 10))
  }
  return out
}

export function shortDayLabel(isoDay: string): string {
  const [, m, d] = isoDay.split("-")
  return `${m}/${d}`
}
