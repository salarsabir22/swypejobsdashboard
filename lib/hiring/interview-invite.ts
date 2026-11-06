export function defaultInterviewMessage(opts: {
  recruiterName: string
  companyName: string
  roleTitle: string
  calendlyUrl?: string | null
}) {
  const recruiter = opts.recruiterName.trim() || "A recruiter"
  const company = opts.companyName.trim() || "their company"
  const role = opts.roleTitle.trim() || "this role"
  const base = `${recruiter} at ${company} wants to interview you for ${role}.`
  const link = opts.calendlyUrl?.trim()
  if (!link) return `${base} Reply here to pick a time.`
  return `${base} Here's the Calendly link to book a 30 min session: ${link}`
}

export function normalizeCalendlyUrl(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ""
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed.replace(/^\/+/, "")}`
}

export type InterviewFormat = "virtual" | "onsite"

const FORMAT_PREFIX: Record<InterviewFormat, string> = {
  virtual: "[Virtual]",
  onsite: "[On-site]",
}

export function encodeInterviewNote(format: InterviewFormat, note?: string | null) {
  const body = note?.trim() || ""
  return body ? `${FORMAT_PREFIX[format]} ${body}` : FORMAT_PREFIX[format]
}

export function interviewFormatFromNote(note: string | null | undefined): InterviewFormat | null {
  const value = (note || "").trim()
  if (value.startsWith("[Virtual]")) return "virtual"
  if (value.startsWith("[On-site]")) return "onsite"
  return null
}

export function interviewFormatLabel(format: InterviewFormat | null | undefined) {
  if (format === "virtual") return "Virtual"
  if (format === "onsite") return "On-site"
  return null
}
