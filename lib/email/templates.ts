/**
 * Transactional email copy. Plain, table-free HTML so it renders everywhere.
 * Each template returns subject + html + text; the sender adds the recipient.
 */

import { siteUrl } from "@/lib/email/mailer"
import type { PipelineStatus } from "@/lib/match/fit"

export type EmailTemplate = {
  key: string
  subject: string
  html: string
  text: string
}

const BRAND = process.env.EMAIL_BRAND_NAME?.trim() || "SwypeJobs"

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

function layout(opts: { heading: string; lines: string[]; cta?: { label: string; href: string }; footer?: string }) {
  const paragraphs = opts.lines.map((l) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#1f2937">${esc(l)}</p>`).join("")
  const cta = opts.cta
    ? `<p style="margin:22px 0"><a href="${esc(opts.cta.href)}" style="display:inline-block;background:#111827;color:#fff;text-decoration:none;padding:11px 18px;border-radius:999px;font-size:14px;font-weight:600">${esc(opts.cta.label)}</a></p>`
    : ""
  const footer = `<p style="margin:26px 0 0;font-size:12px;line-height:1.5;color:#6b7280">${esc(
    opts.footer || `You’re receiving this because you have an account on ${BRAND}. Turn off email updates from your profile.`,
  )}</p>`
  return `<!doctype html><html><body style="margin:0;background:#f5f5f4;padding:28px 12px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;padding:28px 28px 24px;border:1px solid #e7e5e4">
<p style="margin:0 0 18px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#6b7280">${esc(BRAND)}</p>
<h1 style="margin:0 0 16px;font-size:20px;line-height:1.3;color:#111827">${esc(opts.heading)}</h1>
${paragraphs}${cta}${footer}
</div></body></html>`
}

function textOf(heading: string, lines: string[], cta?: { label: string; href: string }) {
  return [heading, "", ...lines, cta ? `\n${cta.label}: ${cta.href}` : "", "", `— ${BRAND}`].join("\n").trim()
}

function make(key: string, subject: string, heading: string, lines: string[], cta?: { label: string; href: string }): EmailTemplate {
  return { key, subject, html: layout({ heading, lines, cta }), text: textOf(heading, lines, cta) }
}

/* ---------- Employers ---------- */

export function employerApprovedEmail(opts: { recruiterName?: string | null; companyName?: string | null }) {
  const who = opts.recruiterName ? `Hi ${opts.recruiterName},` : "Hi,"
  const company = opts.companyName || "your company"
  return make(
    "employer_approved",
    `${company} is approved on ${BRAND}`,
    "Your employer account is approved",
    [who, `The Career Development Center has verified ${company}. You can now post roles, review applicants, and chat with candidates.`],
    { label: "Post a job", href: `${siteUrl()}/jobs/new` },
  )
}

export function employerRejectedEmail(opts: { recruiterName?: string | null; companyName?: string | null; reason?: string | null }) {
  const who = opts.recruiterName ? `Hi ${opts.recruiterName},` : "Hi,"
  const company = opts.companyName || "your company"
  const lines = [who, `We couldn’t approve ${company} on ${BRAND} at this time.`]
  if (opts.reason) lines.push(`Reason: ${opts.reason}`)
  lines.push("Reply to this email or contact the Career Development Center if you’d like to provide more information.")
  return make("employer_rejected", `Update on your ${BRAND} employer application`, "Employer application not approved", lines)
}

/* ---------- Jobs (moderation) ---------- */

export function jobApprovedEmail(opts: { recruiterName?: string | null; jobTitle: string; jobId: string }) {
  const who = opts.recruiterName ? `Hi ${opts.recruiterName},` : "Hi,"
  return make(
    "job_approved",
    `“${opts.jobTitle}” is now live`,
    "Your job posting is live",
    [who, `“${opts.jobTitle}” has been approved and is now visible to students. We’ll let you know when applications arrive.`],
    { label: "View posting", href: `${siteUrl()}/jobs/${opts.jobId}` },
  )
}

export function jobRejectedEmail(opts: { recruiterName?: string | null; jobTitle: string; jobId: string; flags?: string[] }) {
  const who = opts.recruiterName ? `Hi ${opts.recruiterName},` : "Hi,"
  const lines = [who, `“${opts.jobTitle}” was not approved and is currently offline.`]
  if (opts.flags?.length) lines.push(`Flagged for: ${opts.flags.join(", ")}.`)
  lines.push("Edit the posting to address the feedback and it will be reviewed again.")
  return make("job_rejected", `“${opts.jobTitle}” needs changes`, "Job posting not approved", lines, {
    label: "Edit posting",
    href: `${siteUrl()}/jobs/${opts.jobId}/edit`,
  })
}

/* ---------- Students ---------- */

const PIPELINE_COPY: Record<PipelineStatus, { subject: (job: string) => string; heading: string; body: (job: string, company: string) => string } | null> = {
  chatting: null,
  passed: null,
  shortlisted: {
    subject: (job) => `You’ve been shortlisted for ${job}`,
    heading: "You’ve been shortlisted",
    body: (job, company) => `${company} shortlisted you for ${job}. Keep an eye on your inbox and chat for next steps.`,
  },
  interview: {
    subject: (job) => `Interview stage: ${job}`,
    heading: "You’re moving to interviews",
    body: (job, company) => `${company} moved your application for ${job} to the interview stage. Open chat to coordinate a time.`,
  },
  offer: {
    subject: (job) => `Offer received for ${job}`,
    heading: "You have an offer",
    body: (job, company) => `${company} has extended an offer for ${job}. Check chat for the details.`,
  },
  hired: {
    subject: (job) => `Congratulations — ${job}`,
    heading: "Congratulations, you’re hired",
    body: (job, company) => `${company} marked you as hired for ${job}. The Career Development Center has been notified of your placement.`,
  },
}

export function pipelineUpdateEmail(opts: {
  studentName?: string | null
  status: PipelineStatus
  jobTitle: string
  companyName?: string | null
  matchId: string
}): EmailTemplate | null {
  const copy = PIPELINE_COPY[opts.status]
  if (!copy) return null
  const who = opts.studentName ? `Hi ${opts.studentName},` : "Hi,"
  const company = opts.companyName || "The employer"
  return make(
    `pipeline_${opts.status}`,
    copy.subject(opts.jobTitle),
    copy.heading,
    [who, copy.body(opts.jobTitle, company)],
    { label: "Open my applications", href: `${siteUrl()}/matches` },
  )
}

export function interviewInviteEmail(opts: {
  studentName?: string | null
  jobTitle: string
  companyName?: string | null
  message: string
  matchId: string
}) {
  const who = opts.studentName ? `Hi ${opts.studentName},` : "Hi,"
  const company = opts.companyName || "The employer"
  const href = `${siteUrl()}/chat/${opts.matchId}`
  return make(
    "interview_invite",
    `Interview invite: ${opts.jobTitle}`,
    `${company} wants to interview you`,
    [who, `${company} sent you an interview invite for ${opts.jobTitle}:`, opts.message],
    { label: "Reply in chat", href },
  )
}

export function deadlineReminderEmail(opts: { studentName?: string | null; jobTitle: string; companyName?: string | null; jobId: string; deadlineLabel: string }) {
  const who = opts.studentName ? `Hi ${opts.studentName},` : "Hi,"
  const company = opts.companyName ? ` at ${opts.companyName}` : ""
  return make(
    "deadline_reminder",
    `${opts.jobTitle} closes ${opts.deadlineLabel.toLowerCase()}`,
    "A saved job is closing soon",
    [who, `You saved ${opts.jobTitle}${company} but haven’t applied yet. Applications close ${opts.deadlineLabel.toLowerCase()}.`],
    { label: "Apply now", href: `${siteUrl()}/jobs/${opts.jobId}/apply` },
  )
}

export function employerInviteEmail(opts: {
  companyName: string
  university: string
  contactName?: string | null
  message?: string | null
  inviteUrl: string
}) {
  const who = opts.contactName ? `Hi ${opts.contactName},` : "Hi,"
  const lines = [
    who,
    `The career office at ${opts.university} has invited ${opts.companyName} to join ${BRAND} and share opportunities with its students.`,
  ]
  if (opts.message?.trim()) lines.push(opts.message.trim())
  lines.push("Use the link below to create or link your company account. The invitation expires in 14 days.")
  return make(
    "employer_invite",
    `${opts.university} invited ${opts.companyName} to ${BRAND}`,
    "You're invited to post roles",
    lines,
    { label: "Accept invitation", href: opts.inviteUrl },
  )
}
