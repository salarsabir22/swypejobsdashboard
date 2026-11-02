"use client"

import { useState } from "react"
import { Mail } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/lib/hooks/use-toast"
import { Card, CardContent } from "@/components/ui/card"

/** Per-user opt-out for transactional emails (shortlist, interview, approvals, deadline reminders). */
export function EmailPreferencesCard({ userId, enabled: initial, role }: { userId: string; enabled: boolean; role: "student" | "recruiter" }) {
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
        description: missing ? "Email preferences aren’t enabled yet. Run the email_notifications migration." : error.message,
      })
    } else {
      toast({ title: next ? "Email updates on" : "Email updates off" })
    }
    setSaving(false)
  }

  const what =
    role === "student"
      ? "shortlists, interview invites, offers, and reminders for saved jobs that are closing"
      : "account approval and job posting review results"

  return (
    <Card className="shadow-sm">
      <CardContent className="p-5">
        <h2 className="mb-2 font-data text-[10px] uppercase tracking-wide text-muted-foreground">Email updates</h2>
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-0.5 size-4 accent-[var(--primary)]"
            checked={enabled}
            disabled={saving}
            onChange={(e) => void toggle(e.target.checked)}
          />
          <span>
            <span className="flex items-center gap-1.5 font-medium">
              <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              Email me about {what}
            </span>
            <span className="mt-0.5 block text-[13px] text-muted-foreground">
              In-app notifications stay on either way. Security emails (password resets) are always sent.
            </span>
          </span>
        </label>
      </CardContent>
    </Card>
  )
}
