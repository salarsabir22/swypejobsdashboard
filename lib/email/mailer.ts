/**
 * Outbound email transport. Server-only.
 *
 * Provider is picked from env:
 *   - RESEND_API_KEY                → Resend HTTP API
 *   - SMTP_USER + SMTP_PASS (+HOST) → SMTP via nodemailer (Gmail defaults)
 * If neither is set, sends are skipped (returns ok:false, skipped:true) so the app
 * works in dev without email.
 */

import nodemailer from "nodemailer"

export type MailMessage = {
  to: string
  subject: string
  html: string
  text: string
}

export type MailResult = { ok: true; id?: string } | { ok: false; skipped?: boolean; error: string }

export function mailFrom() {
  return (
    process.env.EMAIL_FROM?.trim() ||
    process.env.SMTP_FROM?.trim() ||
    process.env.SMTP_USER?.trim() ||
    "SwypeJobs <onboarding@resend.dev>"
  )
}

export function siteUrl() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim() || process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (raw) return raw.replace(/\/+$/, "")
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return "http://localhost:3000"
}

function resendKey() {
  return process.env.RESEND_API_KEY?.trim() || null
}

function smtpTransport() {
  const user = process.env.SMTP_USER?.trim()
  const pass = process.env.SMTP_PASS?.trim()
  if (!user || !pass) return null
  const host = process.env.SMTP_HOST?.trim() || "smtp.gmail.com"
  const port = Number(process.env.SMTP_PORT || 465)
  const secure = process.env.SMTP_SECURE === "false" ? false : port === 465
  return nodemailer.createTransport({ host, port, secure, auth: { user, pass } })
}

export function emailConfigured() {
  return Boolean(resendKey() || smtpTransport())
}

export async function sendMail(message: MailMessage): Promise<MailResult> {
  const key = resendKey()
  if (key) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: mailFrom(),
          to: [message.to],
          subject: message.subject,
          html: message.html,
          text: message.text,
        }),
      })
      if (!res.ok) {
        const detail = await res.text().catch(() => "")
        return { ok: false, error: `Resend ${res.status}: ${detail.slice(0, 300)}` }
      }
      const json = (await res.json().catch(() => ({}))) as { id?: string }
      return { ok: true, id: json.id }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Resend request failed" }
    }
  }

  const transport = smtpTransport()
  if (!transport) return { ok: false, skipped: true, error: "Email not configured" }
  try {
    const info = await transport.sendMail({ from: mailFrom(), ...message })
    return { ok: true, id: info.messageId }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "SMTP send failed" }
  }
}
