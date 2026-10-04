"use client"

import { useState } from "react"
import { Calendar } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/lib/hooks/use-toast"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

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
  const [link, setLink] = useState("")
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (!when) {
      toast({ variant: "destructive", title: "Pick a time" })
      return
    }
    setBusy(true)
    const supabase = createClient()
    const proposedAt = new Date(when).toISOString()
    const { error } = await supabase.from("interview_proposals").insert({
      match_id: matchId,
      conversation_id: conversationId,
      proposed_by: currentUserId,
      proposed_at: proposedAt,
      location_or_link: link.trim() || null,
      note: note.trim() || null,
    })
    if (error) {
      toast({ variant: "destructive", title: "Could not send", description: error.message })
      setBusy(false)
      return
    }

    const whenLabel = new Date(when).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    const text = `Interview proposed for ${whenLabel}${link.trim() ? ` · ${link.trim()}` : ""}`
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
    onSent?.(text)
    toast({ title: "Interview proposed" })
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
            <DialogDescription>Sends a chat message and moves this match to Interview.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="interview-when">When</Label>
              <Input id="interview-when" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="interview-link">Link or location (optional)</Label>
              <Input
                id="interview-link"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="Meet / Zoom / office"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="interview-note">Note (optional)</Label>
              <Textarea id="interview-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={busy} onClick={() => void submit()}>
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
