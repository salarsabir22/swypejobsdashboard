"use client"

import { useState } from "react"
import { Mail } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/lib/hooks/use-toast"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

/** Per-user opt-out for transactional emails (shortlist, interview, approvals, deadline reminders). */
export function EmailPreferencesCard({
  userId,
  enabled: initial,
  role,
}: {
  userId: string
  enabled: boolean
  role: "student" | "recruiter"
}) {
  const { toast } = useToast()
  const [enabled, setEnabled] = useState(initial)
  const [saving, setSaving] = useState(false)

  const toggle = async (next: boolean) => {
    setSaving(true)
    setEnabled(next)
    const supabase = createClient()
    const { error } = await supabase.from("profiles").update({ email_notifications: next }).eq("id", userId)
    if (error) {
      setEnabled(!next)
      const missing = /email_notifications/i.test(error.message) && /column|schema/i.test(error.message)
      toast({
        variant: "destructive",
        title: "Couldn’t save",
        description: missing
          ? "Email preferences aren’t enabled yet. Run the email_notifications migration."
          : error.message,
      })
    } else {
      toast({ title: next ? "Email updates on" : "Email updates off" })
    }
    setSaving(false)
  }

  const what =
    role === "student"
      ? "Shortlists, interview invites, offers, and closing deadlines on saved jobs"
      : "Account approval and job posting review results"

  return (
    <Card className="shadow-sm">
      <CardContent className="space-y-4 p-5">
        <div>
          <h2 className="font-data text-[10px] uppercase tracking-wide text-muted-foreground">Email updates</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Choose whether SwypeJobs emails you about hiring activity.
          </p>
        </div>

        <label
          className={cn(
            "flex cursor-pointer items-start gap-3 rounded-2xl border border-border p-3.5 transition-colors",
            "hover:bg-muted/40 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
            enabled && "border-primary/30 bg-secondary/50"
          )}
        >
          <span
            className={cn(
              "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background",
              enabled && "border-primary/20 text-primary"
            )}
            aria-hidden
          >
            <Mail className="h-4 w-4" />
          </span>

          <span className="min-w-0 flex-1 space-y-1">
            <span className="block text-sm font-medium leading-snug text-foreground">{what}</span>
            <span className="block text-[13px] leading-snug text-muted-foreground">
              In-app notifications stay on either way. Security emails (password resets) are always sent.
            </span>
          </span>

          <input
            type="checkbox"
            className="mt-1.5 size-5 shrink-0 accent-[var(--primary)]"
            checked={enabled}
            disabled={saving}
            aria-label={enabled ? "Turn off email updates" : "Turn on email updates"}
            onChange={(e) => void toggle(e.target.checked)}
          />
        </label>
      </CardContent>
    </Card>
  )
}
