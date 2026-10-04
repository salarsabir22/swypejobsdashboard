"use client"

import { useEffect, useState } from "react"
import { Calendar } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/lib/hooks/use-toast"
import { Button } from "@/components/ui/button"

type Proposal = {
  id: string
  proposed_by: string
  proposed_at: string
  location_or_link: string | null
  note: string | null
  status: string
}

export function InterviewRsvpBanner({
  conversationId,
  currentUserId,
  matchId,
}: {
  conversationId: string
  currentUserId: string
  matchId?: string | null
}) {
  const { toast } = useToast()
  const [proposal, setProposal] = useState<Proposal | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false
    void supabase
      .from("interview_proposals")
      .select("id, proposed_by, proposed_at, location_or_link, note, status")
      .eq("conversation_id", conversationId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setProposal((data as Proposal | null) ?? null)
      })
    return () => {
      cancelled = true
    }
  }, [conversationId])

  if (!proposal) return null

  const when = new Date(proposal.proposed_at).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  })
  const mine = proposal.proposed_by === currentUserId

  const setStatus = async (status: "accepted" | "declined" | "cancelled") => {
    setBusy(true)
    const supabase = createClient()
    const { error } = await supabase.from("interview_proposals").update({ status }).eq("id", proposal.id)
    if (error) {
      toast({ variant: "destructive", title: "Could not update", description: error.message })
      setBusy(false)
      return
    }
    if (status === "declined" && matchId) {
      await supabase.from("matches").update({ pipeline_status: "chatting" }).eq("id", matchId)
    }
    if (status === "accepted" && matchId) {
      await supabase.from("matches").update({ pipeline_status: "interview" }).eq("id", matchId)
    }
    setProposal(null)
    toast({
      title: status === "accepted" ? "Interview accepted" : status === "declined" ? "Interview declined" : "Interview cancelled",
    })
    setBusy(false)
  }

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-muted/40 px-3 py-2">
      <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
      <p className="min-w-0 flex-1 font-body text-xs text-foreground">
        {mine ? "Interview proposed" : "Interview request"} · {when}
        {proposal.location_or_link ? ` · ${proposal.location_or_link}` : ""}
      </p>
      {mine ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 rounded-full"
          disabled={busy}
          onClick={() => void setStatus("cancelled")}
        >
          Cancel
        </Button>
      ) : (
        <>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 rounded-full"
            disabled={busy}
            onClick={() => void setStatus("declined")}
          >
            Decline
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8 rounded-full"
            disabled={busy}
            onClick={() => void setStatus("accepted")}
          >
            Accept
          </Button>
        </>
      )}
    </div>
  )
}
