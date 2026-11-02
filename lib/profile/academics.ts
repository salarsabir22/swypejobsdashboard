/** More than one degree. The record marked current is copied onto the single profile columns targeting already uses. */

export type AcademicRecord = {
  id: string
  institution: string
  degree: string
  department: string
  startYear: string
  endYear: string
  cgpa: string
  current: boolean
}

function text(value: unknown) {
  return typeof value === "string" ? value : ""
}

export function parseAcademicHistory(value: unknown): AcademicRecord[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((raw) => {
    if (!raw || typeof raw !== "object") return []
    const row = raw as Record<string, unknown>
    const institution = text(row.institution).trim()
    const degree = text(row.degree).trim()
    if (!institution && !degree) return []
    return [{
      id: text(row.id) || crypto.randomUUID(),
      institution,
      degree,
      department: text(row.department),
      startYear: text(row.startYear || row.start_year),
      endYear: text(row.endYear || row.end_year),
      cgpa: row.cgpa === null || row.cgpa === undefined ? "" : String(row.cgpa),
      current: row.current === true,
    }]
  })
}

export function emptyAcademicRecord(): AcademicRecord {
  return { id: crypto.randomUUID(), institution: "", degree: "", department: "", startYear: "", endYear: "", cgpa: "", current: false }
}

/** Fields to copy onto student_profiles so Discover and eligibility keep working. */
export function primaryAcademicFields(records: AcademicRecord[]) {
  const current = records.find((r) => r.current) || records[0]
  if (!current) return null
  const year = Number(current.endYear)
  const cgpa = Number(current.cgpa)
  return {
    university: current.institution.trim() || null,
    degree: current.degree.trim() || null,
    department: current.department.trim() || null,
    graduation_year: Number.isFinite(year) && year > 0 ? year : null,
    cgpa: Number.isFinite(cgpa) && cgpa >= 0 && cgpa <= 4 ? cgpa : null,
  }
}
