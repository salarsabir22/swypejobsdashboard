import { newId, type CoverLetter, type JsonResume } from "@/lib/resume/schema"

export const COVER_LETTER_QUESTION_ID = "cover_letter"

export function draftCoverLetter(opts: {
  resume: JsonResume
  company?: string
  role?: string
}): string {
  const name = opts.resume.basics.name?.trim() || "the candidate"
  const degree = opts.resume.basics.label?.trim()
  const school = opts.resume.education[0]?.institution?.trim()
  const summary = opts.resume.basics.summary?.trim()
  const skills = opts.resume.skills
    .map((s) => s.name)
    .filter(Boolean)
    .slice(0, 6)
  const company = opts.company?.trim() || "your team"
  const role = opts.role?.trim() || "this role"

  const who = [degree, school ? `student at ${school}` : null].filter(Boolean).join(" ")
  const skillLine = skills.length ? ` I bring experience with ${skills.join(", ")}.` : ""
  const about = summary ? ` ${summary.replace(/\s+/g, " ")}` : ""

  return [
    `Dear ${company} hiring team,`,
    "",
    `I am writing to apply for the ${role} role at ${company}.${who ? ` I am a ${who}.` : ""}${about}${skillLine}`,
    "",
    "I would welcome the chance to contribute and would be glad to share more in an interview.",
    "",
    "Sincerely,",
    name,
  ].join("\n")
}

export function newCoverLetter(partial?: Partial<CoverLetter>): CoverLetter {
  const role = partial?.role?.trim() || ""
  const company = partial?.company?.trim() || ""
  return {
    id: partial?.id || newId(),
    title: partial?.title?.trim() || [role, company].filter(Boolean).join(" · ") || "Cover letter",
    company,
    role,
    body: partial?.body || "",
    updatedAt: new Date().toISOString(),
  }
}
