export type ScreeningQuestionType = "text" | "video"

export type ScreeningQuestion = {
  id: string
  prompt: string
  type: ScreeningQuestionType
  required: boolean
}

export function parseScreeningQuestions(value: unknown): ScreeningQuestion[] {
  if (!Array.isArray(value)) return []
  return value
    .map((row) => {
      if (!row || typeof row !== "object") return null
      const item = row as Record<string, unknown>
      const prompt = typeof item.prompt === "string" ? item.prompt.trim() : ""
      if (!prompt) return null
      const type: ScreeningQuestionType = item.type === "video" ? "video" : "text"
      return {
        id: typeof item.id === "string" && item.id ? item.id : crypto.randomUUID(),
        prompt,
        type,
        required: Boolean(item.required),
      } satisfies ScreeningQuestion
    })
    .filter((row): row is ScreeningQuestion => Boolean(row))
}

export function jobHasMandatoryQuestions(job: { screening_questions?: unknown } | null | undefined) {
  return parseScreeningQuestions(job?.screening_questions).some((q) => q.required)
}

export function parseRequiredSemesters(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.map((n) => Number(n)).filter((n) => Number.isInteger(n) && n >= 1 && n <= 12))].sort(
    (a, b) => a - b
  )
}

export function studentEligibleForJob(opts: {
  requiredSemesters?: unknown
  stillEnrolled?: boolean | null
  currentSemester?: number | null
}) {
  const required = parseRequiredSemesters(opts.requiredSemesters)
  if (required.length === 0) return true
  if (!opts.stillEnrolled) return false
  const semester = Number(opts.currentSemester)
  return required.includes(semester)
}

export function applyHref(jobId: string) {
  return `/jobs/${jobId}/apply`
}
