/** Group the existing attention list by program so a quiet department surfaces as one alert. */

export type DepartmentAlert = {
  department: string
  students: number
  reasons: string[]
}

export function departmentAlerts(
  rows: { major?: string | null; reason: string }[],
  minimum = 3,
): DepartmentAlert[] {
  const byDept = new Map<string, { students: number; reasons: Map<string, number> }>()
  for (const row of rows) {
    const department = row.major?.trim() || "Undeclared"
    const bucket = byDept.get(department) || { students: 0, reasons: new Map() }
    bucket.students += 1
    bucket.reasons.set(row.reason, (bucket.reasons.get(row.reason) || 0) + 1)
    byDept.set(department, bucket)
  }
  return [...byDept.entries()]
    .filter(([, bucket]) => bucket.students >= minimum)
    .map(([department, bucket]) => ({
      department,
      students: bucket.students,
      reasons: [...bucket.reasons.entries()].sort((a, b) => b[1] - a[1]).map(([reason, n]) => `${reason} (${n})`),
    }))
    .sort((a, b) => b.students - a.students)
}
