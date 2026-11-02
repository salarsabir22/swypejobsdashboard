/** Applicant mix for a single job posting. Pure aggregation; the page supplies the rows. */

export type InsightStudent = {
  degree?: string | null
  graduation_year?: number | null
  is_alumni?: boolean | null
  still_enrolled?: boolean | null
  cgpa?: number | string | null
}

export type MixSlice = { label: string; count: number; pct: number }

function topSlices(counts: Map<string, number>, total: number, limit = 6): MixSlice[] {
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1])
  const head = sorted.slice(0, limit)
  const rest = sorted.slice(limit).reduce((n, [, c]) => n + c, 0)
  const slices = head.map(([label, count]) => ({ label, count, pct: total ? Math.round((count / total) * 100) : 0 }))
  if (rest > 0) slices.push({ label: "Other", count: rest, pct: total ? Math.round((rest / total) * 100) : 0 })
  return slices
}

function cgpaBand(value: unknown) {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return "CGPA not set"
  if (n < 2.5) return "Below 2.50"
  if (n < 3) return "2.50 – 2.99"
  if (n < 3.5) return "3.00 – 3.49"
  return "3.50 – 4.00"
}

export function applicantMix(students: InsightStudent[]) {
  const total = students.length
  const degrees = new Map<string, number>()
  const years = new Map<string, number>()
  const bands = new Map<string, number>()
  let alumni = 0
  for (const s of students) {
    const degree = s.degree?.trim() || "Degree not set"
    degrees.set(degree, (degrees.get(degree) || 0) + 1)
    const year = s.graduation_year ? `Class of ${s.graduation_year}` : "Year not set"
    years.set(year, (years.get(year) || 0) + 1)
    const band = cgpaBand(s.cgpa)
    bands.set(band, (bands.get(band) || 0) + 1)
    const graduated = s.is_alumni === true || (s.still_enrolled === false && Number(s.graduation_year) > 0 && Number(s.graduation_year) < new Date().getFullYear())
    if (graduated) alumni += 1
  }
  return {
    total,
    alumni,
    students: total - alumni,
    degrees: topSlices(degrees, total),
    years: topSlices(years, total),
    cgpa: topSlices(bands, total, 5),
  }
}

/** View-to-apply rate, as a whole percent. Null when there are no views. */
export function viewToApplyPct(views: number, applications: number) {
  if (views <= 0) return null
  return Math.round((applications / views) * 100)
}
