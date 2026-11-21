"use client"

import { useState } from "react"
import { Check, Copy, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"

/**
 * Invites work without an email provider: the link can be copied or handed to
 * the user's own mail client instead of relying on RESEND/SMTP.
 */
export function CopyInviteLink({
  url,
  email,
  company,
}: {
  url: string | null | undefined
  email?: string | null
  company?: string | null
}) {
  const [copied, setCopied] = useState(false)

  if (!url) return <span className="text-xs text-muted-foreground">—</span>

  const subject = `Invitation to SwypeJobs${company ? ` — ${company}` : ""}`
  const body = `You're invited to join SwypeJobs${company ? ` as ${company}` : ""}.\n\nOpen this link to accept:\n${url}\n`
  const mailto = `mailto:${email || ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 rounded-full px-2.5"
        onClick={() => void copy()}
      >
        {copied ? <Check className="size-3.5" strokeWidth={1.75} /> : <Copy className="size-3.5" strokeWidth={1.75} />}
        {copied ? "Copied" : "Copy link"}
      </Button>
      {email ? (
        <Button asChild size="sm" variant="ghost" className="h-8 rounded-full px-2.5">
          <a href={mailto}>
            <Mail className="size-3.5" strokeWidth={1.75} />
            Email it
          </a>
        </Button>
      ) : null}
    </div>
  )
}
