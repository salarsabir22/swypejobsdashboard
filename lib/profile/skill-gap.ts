/** Skills that show up on live roles in the student's categories but are missing from their profile. */

export function skillGaps(
  studentSkills: string[] | null | undefined,
  jobs: { category?: string | null; required_skills?: string[] | null }[],
  preferredCategories: string[] | null | undefined,
  limit = 6,
) {
  const have = new Set((studentSkills || []).map((s) => s.trim().toLowerCase()).filter(Boolean))
  const preferred = new Set((preferredCategories || []).map((c) => c.toLowerCase()))
  const pool = preferred.size
    ? jobs.filter((job) => job.category && preferred.has(job.category.toLowerCase()))
    : jobs
  const source = pool.length ? pool : jobs
  const counts = new Map<string, { label: string; count: number }>()
  for (const job of source) {
    for (const skill of job.required_skills || []) {
      const label = skill.trim()
      const key = label.toLowerCase()
      if (!key || have.has(key)) continue
      const row = counts.get(key) || { label, count: 0 }
      row.count += 1
      counts.set(key, row)
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, limit)
}
