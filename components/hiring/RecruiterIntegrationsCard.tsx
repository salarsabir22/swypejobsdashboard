"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/lib/hooks/use-toast"
import { normalizeCalendlyUrl } from "@/lib/hiring/interview-invite"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type CalendarStatus = {
  configured: boolean
  connected: boolean
  email: string | null
  error?: string
}

export function RecruiterIntegrationsCard({
  calendlyUrl: initialCalendly,
}: {
  calendlyUrl?: string | null
}) {
  const { toast } = useToast()
  const [calendly, setCalendly] = useState(initialCalendly ?? "")
  const [saving, setSaving] = useState(false)
  const [calendar, setCalendar] = useState<CalendarStatus | null>(null)
  const [calendarBusy, setCalendarBusy] = useState(false)

  const loadCalendar = async () => {
    const res = await fetch("/api/calendar/google/status")
    const body = (await res.json().catch(() => null)) as CalendarStatus | null
    if (res.ok && body) setCalendar(body)
  }

  useEffect(() => {
    const timer = setTimeout(() => void loadCalendar(), 0)
    return () => clearTimeout(timer)
  }, [])

  const saveCalendly = async () => {
    setSaving(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setSaving(false)
      return
    }
    const url = normalizeCalendlyUrl(calendly)
    const { error } = await supabase.from("recruiter_profiles").update({ calendly_url: url || null }).eq("id", user.id)
    if (error) {
      toast({ variant: "destructive", title: "Could not save Calendly", description: error.message })
    } else {
      setCalendly(url)
      toast({ title: "Calendly saved" })
    }
    setSaving(false)
  }

  const disconnectCalendar = async () => {
    setCalendarBusy(true)
    const res = await fetch("/api/calendar/google/disconnect", { method: "POST" })
    const body = (await res.json().catch(() => null)) as { error?: string } | null
    setCalendarBusy(false)
    if (!res.ok) {
      toast({ variant: "destructive", title: "Could not disconnect", description: body?.error })
      return
    }
    toast({ title: "Google Calendar disconnected" })
    void loadCalendar()
  }

  return (
    <Card className="shadow-sm">
      <CardContent className="space-y-6 p-5">
        <div className="space-y-5">
          <div>
            <h2 className="text-[16px] font-semibold tracking-[-0.02em]">Google Calendar</h2>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Schedule virtual interviews from chat and drop a Meet blocker on your calendar without leaving SwypeJobs.
            </p>
          </div>
          {calendar?.connected ? (
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm text-muted-foreground">Connected as {calendar.email || "Google account"}</p>
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                loading={calendarBusy}
                loadingText="Disconnecting…"
                onClick={() => void disconnectCalendar()}
              >
                Disconnect
              </Button>
            </div>
          ) : calendar?.configured ? (
            <Button type="button" className="rounded-full" asChild>
              <a href="/api/calendar/google/start">Connect Google Calendar</a>
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Google Calendar isn’t configured for this workspace yet. Ask an admin to add the Google OAuth keys.
            </p>
          )}
        </div>

        <div className="space-y-5 border-t border-border pt-5">
          <div>
            <h2 className="text-[16px] font-semibold tracking-[-0.02em]">Calendly</h2>
            <p className="mt-1 text-[13px] text-muted-foreground">
              This link is included when you shortlist someone, so they can book a 30-minute interview.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="calendly-url">Booking link</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="calendly-url"
                value={calendly}
                onChange={(e) => setCalendly(e.target.value)}
                placeholder="https://calendly.com/your-company/30min"
              />
              <Button type="button" className="shrink-0" onClick={() => void saveCalendly()} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
