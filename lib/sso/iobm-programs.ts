/** IoBM colleges and undergraduate programmes for SSO profile creation. */

export const IOBM_STUDENT_ID_PATTERN = /^\d{5}-\d{5}$/
export const IOBM_STUDENT_ID_PLACEHOLDER = "12345-67890"
export const IOBM_STUDENT_ID_HELP = "Use your IoBM student ID as five digits, a hyphen, then five digits (e.g. 20211-12345)."

export type IobmCollegeId = "cbm" | "cesd" | "ccsis"

export type IobmCollege = {
  id: IobmCollegeId
  name: string
  shortName: string
  programs: readonly string[]
}

export const IOBM_COLLEGES: readonly IobmCollege[] = [
  {
    id: "cbm",
    name: "College of Business Management (CBM)",
    shortName: "CBM",
    programs: [
      "Bachelor of Business Administration (BBA)",
      "BS Accounting and Finance",
      "BS Digital & Neuromarketing",
      "BS Entrepreneurship",
      "BS in Business Intelligence and Analytics",
      "BS Supply Chain Management",
    ],
  },
  {
    id: "cesd",
    name: "College of Economics & Social Development (CESD)",
    shortName: "CESD",
    programs: [
      "B.Ed. Honors (1.5 years)",
      "B.Ed. Honors (2.5 years)",
      "BS Business and Psychology",
      "BS Economics",
      "BS Economics and Finance",
      "BS Media Studies",
      "BS Psychology",
    ],
  },
  {
    id: "ccsis",
    name: "College of Computer Sciences & Information Systems (CCSIS)",
    shortName: "CCSIS",
    programs: [
      "BS Actuarial Science and Risk Management",
      "BS Artificial Intelligence",
      "BS Computer Engineering",
      "BS Computer Science",
      "BS Data Science",
      "BS Mathematics and Computational Finance",
      "BS Mathematics and Economics",
      "BS Software Engineering",
      "BS Statistics & Business Analytics",
      "BS Technology Management",
    ],
  },
] as const

export function normalizeIobmStudentId(value: string) {
  return value.trim().replace(/\s+/g, "")
}

export function isValidIobmStudentId(value: string) {
  return IOBM_STUDENT_ID_PATTERN.test(normalizeIobmStudentId(value))
}

export function iobmCollegeById(id: string | null | undefined) {
  return IOBM_COLLEGES.find((college) => college.id === id) ?? null
}

export function iobmCollegeByName(name: string | null | undefined) {
  if (!name?.trim()) return null
  const needle = name.trim().toLowerCase()
  return (
    IOBM_COLLEGES.find(
      (college) =>
        college.name.toLowerCase() === needle ||
        college.shortName.toLowerCase() === needle ||
        college.id === needle
    ) ?? null
  )
}

export function iobmProgramsForCollege(collegeId: string | null | undefined) {
  return iobmCollegeById(collegeId)?.programs ?? []
}

/** Resolve which college owns a stored programme name (for edit/reload). */
export function iobmCollegeIdForProgram(program: string | null | undefined): IobmCollegeId | null {
  if (!program?.trim()) return null
  const needle = program.trim().toLowerCase()
  for (const college of IOBM_COLLEGES) {
    if (college.programs.some((p) => p.toLowerCase() === needle)) return college.id
  }
  return null
}
