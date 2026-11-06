export const SEMESTER_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8] as const
export const FINAL_YEAR_SEMESTERS = [7, 8] as const

export type InstitutionType = "university" | "college"

export function parseInstitutionType(value: unknown): InstitutionType {
  return value === "college" ? "college" : "university"
}

export function institutionPlaceLabel(type: unknown) {
  return type === "college" ? "college" : "university"
}

export function enrollmentSummary(opts: {
  stillEnrolled?: boolean | null
  currentSemester?: number | string | null
  institutionType?: unknown
}) {
  if (!opts.stillEnrolled) return null
  const place = institutionPlaceLabel(opts.institutionType)
  const semester = Number(opts.currentSemester)
  if (Number.isInteger(semester) && semester >= 1) return `Still in ${place} · semester ${semester}`
  return `Still in ${place}`
}
