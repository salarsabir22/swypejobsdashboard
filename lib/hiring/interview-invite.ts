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
