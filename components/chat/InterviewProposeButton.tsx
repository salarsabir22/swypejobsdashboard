"use client"

import { useEffect, useState } from "react"
import { Calendar } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/lib/hooks/use-toast"
import { requestStudentEmail } from "@/lib/email/client"
import { encodeInterviewNote, type InterviewFormat } from "@/lib/hiring/interview-invite"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DateTimePicker } from "@/components/ui/date-picker"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type CalendarStatus = {
  configured: boolean
  connected: boolean
  email: string | null
}

export function InterviewProposeButton({
  matchId,
  conversationId,
  currentUserId,
  peerId,
  onSent,
  trigger = "icon",
  open: openProp,
  onOpenChange,
}: {
  matchId: string
  conversationId: string
  currentUserId: string
  peerId: string
  onSent?: (text: string) => void
  trigger?: "icon" | "none"
  open?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const { toast } = useToast()
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const open = openProp ?? uncontrolledOpen
  const setOpen = onOpenChange ?? setUncontrolledOpen
  const [when, setWhen] = useState("")
  const [format, setFormat] = useState<InterviewFormat>("virtual")
  const [link, setLink] = useState("")
  const [note, setNote] = useState("")
  const [addToCalendar, setAddToCalendar] = useState(true)
  const [calendar, setCalendar] = useState<CalendarStatus | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    void fetch("/api/calendar/google/status")
      .then(async (res) => {
        if (!res.ok) return null
        return (await res.json()) as CalendarStatus
      })
      .then((status) => {
        if (!cancelled && status) setCalendar(status)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [open])

  const submit = async () => {
    if (!when) {
      toast({ variant: "destructive", title: "Pick a time" })
      return
    }
    if (format === "onsite" && !link.trim()) {
      toast({ variant: "destructive", title: "Add an on-site location" })
      return
    }

    setBusy(true)
    const supabase = createClient()
    const proposedAt = new Date(when).toISOString()
    let locationOrLink = link.trim() || null
    let calendarCreated = false

    if (format === "virtual" && addToCalendar && calendar?.connected) {
      try {
        const { data: jobRow } = await supabase
          .from("matches")
          .select("jobs(title, company)")
          .eq("id", matchId)
          .maybeSingle()
        const rawJob = jobRow?.jobs as
          | { title?: string | null; company?: string | null }
          | Array<{ title?: string | null; company?: string | null }>
          | null
        const job = Array.isArray(rawJob) ? rawJob[0] : rawJob
        const title = `Interview · ${job?.title || "Role"}${job?.company ? ` · ${job.company}` : ""}`
        const calRes = await fetch("/api/calendar/google/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            start: proposedAt,
            description: note.trim() || "Interview scheduled on SwypeJobs",
            location: locationOrLink || undefined,
            virtual: true,
          }),
        })
        const calBody = (await calRes.json().catch(() => null)) as {
          created?: boolean
          hangoutLink?: string | null
          error?: string
        } | null
        if (!calRes.ok) {
          toast({
            variant: "destructive",
            title: "Could not add Google Calendar event",
            description: calBody?.error || "Connect Google Calendar from Profile and try again.",
          })
          setBusy(false)
          return
        }
        if (calBody?.hangoutLink) locationOrLink = calBody.hangoutLink
        calendarCreated = Boolean(calBody?.created)
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Could not add Google Calendar event",
          description: err instanceof Error ? err.message : "Try again.",
        })
        setBusy(false)
        return
      }
    }

    const encodedNote = encodeInterviewNote(format, note)
    const { error } = await supabase.from("interview_proposals").insert({
      match_id: matchId,
      conversation_id: conversationId,
      proposed_by: currentUserId,
      proposed_at: proposedAt,
      location_or_link: locationOrLink,
      note: encodedNote,
    })
    if (error) {
      toast({ variant: "destructive", title: "Could not send", description: error.message })
      setBusy(false)
      return
    }

    const whenLabel = new Date(when).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    const formatLabel = format === "virtual" ? "Virtual" : "On-site"
    const text = `Interview proposed for ${whenLabel} · ${formatLabel}${locationOrLink ? ` · ${locationOrLink}` : ""}`
    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: currentUserId,
      content: text,
      message_type: "text",
    })
    await supabase.from("notifications").insert({
      user_id: peerId,
      type: "interview_request",
      title: "Interview proposed",
      body: text,
      data: { conversation_id: conversationId, match_id: matchId },
    })
    await supabase.from("matches").update({ pipeline_status: "interview" }).eq("id", matchId)
    requestStudentEmail({
      kind: "interview",
      matchId,
      message: `${text}${note.trim() ? `\n\n${note.trim()}` : ""}`,
    })
    onSent?.(text)
    toast({
      title: "Interview proposed",
      description: calendarCreated ? "Added to your Google Calendar with a Meet link." : undefined,
    })
    setOpen(false)
    setBusy(false)
  }

  return (
    <>
      {trigger === "icon" ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="rounded-full"
          aria-label="Propose interview"
          onClick={() => setOpen(true)}
        >
          <Calendar className="h-5 w-5" />
        </Button>
      ) : null}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Propose an interview</DialogTitle>
            <DialogDescription>
              Choose on-site or virtual. Virtual interviews can add a Google Calendar blocker with Meet from SwypeJobs.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="interview-when">When</Label>
              <DateTimePicker id="interview-when" value={when} onChange={setWhen} />
            </div>
            <div className="space-y-1.5">
              <Label>Format</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={format === "virtual" ? "default" : "outline"}
                  className="rounded-full"
                  onClick={() => setFormat("virtual")}
                >
                  Virtual
                </Button>
                <Button
                  type="button"
                  variant={format === "onsite" ? "default" : "outline"}
                  className="rounded-full"
                  onClick={() => setFormat("onsite")}
                >
                  On-site
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="interview-link">
                {format === "virtual" ? "Meeting link (optional if using Google Meet)" : "On-site location"}
              </Label>
              <Input
                id="interview-link"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder={format === "virtual" ? "Zoom / Teams link" : "Office address or room"}
              />
            </div>
            {format === "virtual" && calendar ? (
              <div className="space-y-2 rounded-2xl border border-border p-3">
                {calendar.connected ? (
                  <>
                    <label className="flex cursor-pointer items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 accent-[var(--primary)]"
                        checked={addToCalendar}
                        onChange={(e) => setAddToCalendar(e.target.checked)}
                      />
                      <span>
                        Add a Google Calendar blocker with a Meet link
                        {calendar.email ? (
                          <span className="mt-0.5 block text-muted-foreground">Connected as {calendar.email}</span>
                        ) : null}
                      </span>
                    </label>
                  </>
                ) : calendar.configured ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Connect Google Calendar once to schedule Meet interviews without leaving SwypeJobs.
                    </p>
                    <Button type="button" variant="outline" className="rounded-full" asChild>
                      <a href="/api/calendar/google/start">Connect Google Calendar</a>
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Google Calendar isn’t configured on this workspace yet. You can still paste a Meet or Zoom link above.
                  </p>
                )}
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label htmlFor="interview-note">Note (optional)</Label>
              <Textarea id="interview-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" loading={busy} loadingText="Sending…" onClick={() => void submit()}>
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
