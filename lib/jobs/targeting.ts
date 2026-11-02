/**
 * Employer audience targeting on a job.
 *
 * Columns on `jobs`: degree_programs text[], graduation_years int[], min_cgpa numeric, experience_level text,
 * plus the older required_semesters int[]. Columns on `student_profiles` used for matching:
 * degree, graduation_year, cgpa, still_enrolled, current_semester.
 */

import { parseRequiredSemesters } from "@/lib/jobs/screening"

export const EXPERIENCE_LEVELS = ["any", "fresh", "experienced"] as const
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number]

export const EXPERIENCE_LABEL: Record<ExperienceLevel, string> = {
  any: "Anyone",
  fresh: "Students & fresh graduates",
  experienced: "Experienced (graduated earlier)",
}

/** Common degree programs offered as quick picks. Employers can also type their own. */
export const DEGREE_PROGRAM_SUGGESTIONS = [
  "BBA",
  "MBA",
  "BS Accounting & Finance",
  "BS Computer Science",
  "BS Software Engineering",
  "BS Economics",
  "BS Media Studies",
  "BE Electrical",
  "BE Industrial",
  "MS Computer Science",
  "MS Finance",
  "BS Psychology",
  "BS Social Sciences",
] as const

export type JobTargeting = {
  degreePrograms: string[]
  graduationYears: number[]
  minCgpa: number | null
  experienceLevel: ExperienceLevel
  requiredSemesters: number[]
  alumniOnly: boolean
  genders: string[]
  departments: string[]
  locationPreferences: string[]
}

export type TargetableJob = {
  degree_programs?: unknown
  graduation_years?: unknown
  min_cgpa?: unknown
  experience_level?: unknown
  required_semesters?: unknown
  alumni_only?: unknown
  target_genders?: unknown
  departments?: unknown
  location_preferences?: unknown
}

export type TargetableStudent = {
  degree?: string | null
  graduation_year?: number | string | null
  cgpa?: number | string | null
  still_enrolled?: boolean | null
  current_semester?: number | string | null
  is_alumni?: boolean | null
  gender?: string | null
  department?: string | null
  preferred_locations?: unknown
}

export function parseDegreePrograms(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of value) {
    if (typeof raw !== "string") continue
    const s = raw.trim()
    if (!s) continue
    const key = s.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(s)
  }
  return out
}

export function parseGraduationYears(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  return [...new Set(value.map((n) => Number(n)).filter((n) => Number.isInteger(n) && n >= 1990 && n <= 2100))].sort(
    (a, b) => a - b
  )
}

export function parseCgpa(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0 || n > 4) return null
  return Math.round(n * 100) / 100
}

export function parseExperienceLevel(value: unknown): ExperienceLevel {
  return value === "fresh" || value === "experienced" ? value : "any"
}

export function parseJobTargeting(job: TargetableJob | null | undefined): JobTargeting {
  return {
    degreePrograms: parseDegreePrograms(job?.degree_programs),
    graduationYears: parseGraduationYears(job?.graduation_years),
    minCgpa: parseCgpa(job?.min_cgpa),
    experienceLevel: parseExperienceLevel(job?.experience_level),
    requiredSemesters: parseRequiredSemesters(job?.required_semesters),
    alumniOnly: job?.alumni_only === true,
    genders: parseDegreePrograms(job?.target_genders).map((g) => g.toLowerCase()),
    departments: parseDegreePrograms(job?.departments),
    locationPreferences: parseDegreePrograms(job?.location_preferences),
  }
}

export function jobHasTargeting(t: JobTargeting) {
  return (
    t.degreePrograms.length > 0 ||
    t.graduationYears.length > 0 ||
    t.minCgpa !== null ||
    t.experienceLevel !== "any" ||
    t.requiredSemesters.length > 0 ||
    t.alumniOnly ||
    t.genders.length > 0 ||
    t.departments.length > 0 ||
    t.locationPreferences.length > 0
  )
}

/** Explicit flag wins; otherwise infer from enrolment + graduation year. */
export function studentIsAlumni(student: TargetableStudent | null | undefined, now = new Date()) {
  if (!student) return false
  if (student.is_alumni === true) return true
  if (student.still_enrolled) return false
  const year = Number(student.graduation_year)
  return Number.isFinite(year) && year > 0 && year < now.getFullYear()
}

function normalize(s: string) {
  return s
    .toLowerCase()
    .replace(/[.()/&,-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Student degree is free text ("B.Sc. Computer Science"), so a program matches when either string
 * contains the other after normalisation, or when every word of the program appears in the degree.
 */
export function degreeMatchesPrograms(degree: string | null | undefined, programs: string[]) {
  if (programs.length === 0) return true
  const d = normalize(degree || "")
  if (!d) return false
  return programs.some((p) => {
    const n = normalize(p)
    if (!n) return false
    if (d.includes(n) || n.includes(d)) return true
    const words = n.split(" ").filter((w) => w.length > 1)
    return words.length > 0 && words.every((w) => d.includes(w))
  })
}

/** Graduated means not enrolled and graduation year strictly before this year (or no year but flagged alumni). */
export function studentIsExperienced(student: TargetableStudent, now = new Date()) {
  const year = Number(student.graduation_year)
  if (student.still_enrolled) return false
  if (!Number.isFinite(year) || year <= 0) return student.is_alumni === true
  return year < now.getFullYear()
}

export type EligibilityResult = { eligible: boolean; reasons: string[] }

/** Full check combining semesters, degree programs, graduation years, CGPA, and experience level. */
export function studentEligibility(job: TargetableJob | null | undefined, student: TargetableStudent | null | undefined): EligibilityResult {
  const t = parseJobTargeting(job)
  const s = student || {}
  const reasons: string[] = []

  if (t.alumniOnly && !studentIsAlumni(s)) {
    reasons.push("Alumni only: mark yourself as graduated on your profile if you have")
  }

  if (t.requiredSemesters.length > 0) {
    const semester = Number(s.current_semester)
    if (!s.still_enrolled || !t.requiredSemesters.includes(semester)) {
      reasons.push(`Open to semester ${t.requiredSemesters.join(" and ")} students only`)
    }
  }

  if (t.degreePrograms.length > 0 && !degreeMatchesPrograms(s.degree, t.degreePrograms)) {
    reasons.push(`Open to ${t.degreePrograms.join(", ")} only`)
  }

  if (t.graduationYears.length > 0) {
    const year = Number(s.graduation_year)
    if (!t.graduationYears.includes(year)) {
      reasons.push(`Open to the class of ${t.graduationYears.join(", ")} only`)
    }
  }

  if (t.minCgpa !== null) {
    const cgpa = parseCgpa(s.cgpa)
    if (cgpa === null) reasons.push(`Requires a CGPA of ${t.minCgpa.toFixed(2)} or higher (add your CGPA to your profile)`)
    else if (cgpa < t.minCgpa) reasons.push(`Requires a CGPA of ${t.minCgpa.toFixed(2)} or higher`)
  }

  if (t.genders.length > 0) {
    const gender = (s.gender || "").toLowerCase()
    if (!gender) reasons.push("Add the gender on your profile. This listing is limited to a specific group.")
    else if (!t.genders.includes(gender)) reasons.push("This listing is limited to a specific gender")
  }

  if (t.departments.length > 0 && !degreeMatchesPrograms(s.department || s.degree, t.departments)) {
    reasons.push(`Open to ${t.departments.join(", ")} only`)
  }

  if (t.locationPreferences.length > 0) {
    const prefs = parseDegreePrograms(s.preferred_locations).map((p) => p.toLowerCase())
    const wanted = t.locationPreferences.map((p) => p.toLowerCase())
    if (!prefs.length) reasons.push(`Set a location preference (${t.locationPreferences.join(", ")}) on your profile`)
    else if (!prefs.some((p) => wanted.some((w) => p.includes(w) || w.includes(p)))) {
      reasons.push(`Open to candidates in ${t.locationPreferences.join(", ")}`)
    }
  }

  if (t.experienceLevel === "fresh" && studentIsExperienced(s)) {
    reasons.push("For current students and fresh graduates only")
  } else if (t.experienceLevel === "experienced" && !studentIsExperienced(s)) {
    reasons.push("For experienced candidates who have already graduated")
  }

  return { eligible: reasons.length === 0, reasons }
}

/** Short lines describing who the job is for, shown on the listing. */
export function describeTargeting(job: TargetableJob | null | undefined): string[] {
  const t = parseJobTargeting(job)
  const lines: string[] = []
  if (t.alumniOnly) lines.push("Alumni only")
  if (t.degreePrograms.length) lines.push(`Programs: ${t.degreePrograms.join(", ")}`)
  if (t.graduationYears.length) lines.push(`Class of ${t.graduationYears.join(", ")}`)
  if (t.requiredSemesters.length) lines.push(`Semester ${t.requiredSemesters.join(" and ")} only`)
  if (t.minCgpa !== null) lines.push(`CGPA ${t.minCgpa.toFixed(2)}+`)
  if (t.experienceLevel !== "any") lines.push(EXPERIENCE_LABEL[t.experienceLevel])
  if (t.genders.length) lines.push(`Gender: ${t.genders.join(", ")}`)
  if (t.departments.length) lines.push(`Departments: ${t.departments.join(", ")}`)
  if (t.locationPreferences.length) lines.push(`Locations: ${t.locationPreferences.join(", ")}`)
  return lines
}
