/**
 * Resolve a user → email address, honour their opt-out, send, and log.
 * Server-only (needs the service-role client to read auth.users).
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import { emailConfigured, sendMail } from "@/lib/email/mailer"
import type { EmailTemplate } from "@/lib/email/templates"

type Admin = SupabaseClient

export type SendOutcome = "sent" | "failed" | "skipped"

async function recipient(admin: Admin, userId: string): Promise<{ email: string | null; optedOut: boolean; name: string | null }> {
  const [{ data: authUser }, profileRes] = await Promise.all([
    admin.auth.admin.getUserById(userId),
    admin.from("profiles").select("full_name, email_notifications").eq("id", userId).maybeSingle(),
  ])
  // email_notifications may not exist until the migration runs → treat as opted in.
  const profile = (profileRes.error ? null : profileRes.data) as { full_name: string | null; email_notifications?: boolean | null } | null
  return {
    email: authUser?.user?.email ?? null,
    optedOut: profile?.email_notifications === false,
    name: profile?.full_name ?? null,
  }
}

async function log(
  admin: Admin,
  row: { user_id: string | null; to_address: string; template: string; subject: string; status: SendOutcome; error?: string | null; data?: Record<string, unknown> },
) {
  // Table may not exist yet; never let logging break the caller.
  await admin.from("email_log").insert({ ...row, error: row.error ?? null, data: row.data ?? {} }).then(() => undefined, () => undefined)
}

/**
 * Send one templated email to a user id. Never throws.
 * `build` receives the recipient's display name so templates can greet them.
 */
export async function emailUser(
  admin: Admin,
  userId: string,
  build: (name: string | null) => EmailTemplate | null,
  data: Record<string, unknown> = {},
): Promise<SendOutcome> {
  try {
    const { email, optedOut, name } = await recipient(admin, userId)
    const tpl = build(name)
    if (!tpl) return "skipped"
    if (!email) {
      await log(admin, { user_id: userId, to_address: "", template: tpl.key, subject: tpl.subject, status: "skipped", error: "no email", data })
      return "skipped"
    }
    if (optedOut) {
      await log(admin, { user_id: userId, to_address: email, template: tpl.key, subject: tpl.subject, status: "skipped", error: "opted out", data })
      return "skipped"
    }
    if (!emailConfigured()) {
      await log(admin, { user_id: userId, to_address: email, template: tpl.key, subject: tpl.subject, status: "skipped", error: "email not configured", data })
      return "skipped"
    }
    const result = await sendMail({ to: email, subject: tpl.subject, html: tpl.html, text: tpl.text })
    await log(admin, {
      user_id: userId,
      to_address: email,
      template: tpl.key,
      subject: tpl.subject,
      status: result.ok ? "sent" : result.skipped ? "skipped" : "failed",
      error: result.ok ? null : result.error,
      data: result.ok && result.id ? { ...data, provider_id: result.id } : data,
    })
    if (!result.ok && !result.skipped) console.error("[email]", tpl.key, userId, result.error)
    return result.ok ? "sent" : result.skipped ? "skipped" : "failed"
  } catch (e) {
    console.error("[email] unexpected", e instanceof Error ? e.message : e)
    return "failed"
  }
}

/** Fire-and-forget helper for route handlers that shouldn't wait on email. */
export function emailUserInBackground(...args: Parameters<typeof emailUser>) {
  void emailUser(...args)
}
