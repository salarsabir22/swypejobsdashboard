"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/lib/hooks/use-toast"
import { defaultInterviewMessage } from "@/lib/hiring/interview-invite"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export type InterviewInviteTarget = {
  matchId: string
  conversationId: string | null
  peerId: string
  roleTitle: string
}

export function InterviewInviteDialog({
  open,
  onOpenChange,
  target,
  recruiterName,
  companyName,
  calendlyUrl,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  target: InterviewInviteTarget | null
  recruiterName: string
  companyName: string
  calendlyUrl?: string | null
}) {
  const { toast } = useToast()
  const [mode, setMode] = useState<"default" | "custom">("default")
  const [custom, setCustom] = useState("")
  const [busy, setBusy] = useState(false)

  const preset = defaultInterviewMessage({
    recruiterName,
    companyName,
    roleTitle: target?.roleTitle || "this role",
    calendlyUrl,
  })

  useEffect(() => {
    if (open) {
      setMode("default")
      setCustom("")
    }
  }, [open, target?.matchId])

  const send = async () => {
    if (!target) return
    const body = mode === "custom" ? custom.trim() : preset
    if (!body) {
      toast({ variant: "destructive", title: "Write a message first" })
      return
    }
    setBusy(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setBusy(false)
      return
    }

    let conversationId = target.conversationId
    if (!conversationId) {
      const { data: conv } = await supabase
        .from("conversations")
        .select("id")
        .eq("match_id", target.matchId)
        .maybeSingle()
      conversationId = conv?.id ?? null
    }

    if (conversationId) {
      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: body,
        message_type: "text",
      })
      if (error) {
        toast({ variant: "destructive", title: "Could not send", description: error.message })
        setBusy(false)
        return
      }
    }

    await supabase.from("notifications").insert({
      user_id: target.peerId,
      type: "interview_request",
      title: "Interview invite",
      body,
      data: {
        match_id: target.matchId,
        conversation_id: conversationId,
        job_title: target.roleTitle,
      },
    })
    await supabase.from("matches").update({ pipeline_status: "interview" }).eq("id", target.matchId)
    toast({ title: "Invite sent", description: conversationId ? "The candidate will see it in chat." : "They’ll get a notification." })
    setBusy(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite to interview</DialogTitle>
          <DialogDescription>
            Send a booking note now, or skip and message them later.
          </DialogDescription>
        </DialogHeader>
        <div className="flex gap-2">
          <Button type="button" variant={mode === "default" ? "default" : "outline"} onClick={() => setMode("default")}>
            Default message
          </Button>
          <Button type="button" variant={mode === "custom" ? "default" : "outline"} onClick={() => setMode("custom")}>
            Custom
          </Button>
        </div>
        {mode === "default" ? (
          <p className="rounded-2xl bg-secondary/70 p-4 text-[14px] leading-relaxed text-foreground">{preset}</p>
        ) : (
          <div className="space-y-1.5">
            <Label htmlFor="invite-custom">Your message</Label>
            <Textarea
              id="invite-custom"
              rows={5}
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              placeholder={preset}
            />
          </div>
        )}
        {!calendlyUrl ? (
          <p className="text-[13px] text-muted-foreground">
            Add a Calendly link on your profile to include a booking URL in the default message.
          </p>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Skip
          </Button>
          <Button type="button" onClick={() => void send()} disabled={busy}>
            {busy ? "Sending…" : "Send invite"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
