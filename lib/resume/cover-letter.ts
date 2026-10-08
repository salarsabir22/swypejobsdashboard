import { htmlToPlain, toEditorHtml } from "@/lib/resume/html"
import { newId, type CoverLetter, type JsonResume } from "@/lib/resume/schema"

export const COVER_LETTER_QUESTION_ID = "cover_letter"

export type LetterTone = "standard" | "short" | "campus"

export function draftCoverLetter(opts: {
  resume: JsonResume
  company?: string
  role?: string
  tone?: LetterTone
}): string {
  const name = opts.resume.basics.name?.trim() || "the candidate"
  const degree = opts.resume.basics.label?.trim()
  const school = opts.resume.education[0]?.institution?.trim()
  const summary = htmlToPlain(opts.resume.basics.summary || "")
  const skills = opts.resume.skills
    .map((s) => s.name)
    .filter(Boolean)
    .slice(0, 6)
  const company = opts.company?.trim() || "your team"
  const role = opts.role?.trim() || "this role"
  const who = [degree, school ? `student at ${school}` : null].filter(Boolean).join(" ")
  const skillLine = skills.length ? ` I work with ${skills.join(", ")}.` : ""
  const about = summary ? ` ${summary.replace(/\s+/g, " ")}` : ""
  const tone = opts.tone || "standard"

  const text =
    tone === "short"
      ? [
          `Hello ${company} team,`,
          "",
          `I'd like to apply for the ${role}.${who ? ` I'm a ${who}.` : ""}${skillLine}`,
          "",
          "Happy to share more on a call.",
          "",
          name,
        ].join("\n")
      : tone === "campus"
        ? [
            `Dear ${company} recruiting team,`,
            "",
            `I'm writing from ${school || "campus"} to apply for the ${role}.${who ? ` I am a ${who}.` : ""}${about}`,
            "",
            `This is a role I would take. Chat on swypejobs is enough for a first conversation — a mutual match already means I want this job.${skillLine}`,
            "",
            "Thank you for considering my application.",
            "",
            "Sincerely,",
            name,
          ].join("\n")
        : [
            `Dear ${company} hiring team,`,
            "",
            `I am writing to apply for the ${role} role at ${company}.${who ? ` I am a ${who}.` : ""}${about}${skillLine}`,
            "",
            "I would welcome the chance to contribute and would be glad to share more in an interview.",
            "",
            "Sincerely,",
            name,
          ].join("\n")

  return toEditorHtml(text)
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
