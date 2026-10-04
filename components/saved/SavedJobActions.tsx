"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/lib/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Loader2, Send, Trash2 } from "lucide-react"

type SavedJobActionsProps = {
  swipeId: string
  jobId: string
  jobTitle: string
  userId: string
  isActive: boolean
}

export function SavedJobActions({ swipeId, jobId, jobTitle, userId, isActive }: SavedJobActionsProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [busy, setBusy] = useState<"apply" | "unsave" | null>(null)

  const apply = async () => {
    if (!isActive) return
    setBusy("apply")
    const supabase = createClient()

    const { error: delErr } = await supabase.from("job_swipes").delete().eq("id", swipeId).eq("student_id", userId)
    if (delErr) {
      toast({ variant: "destructive", title: "Could not apply", description: delErr.message })
      setBusy(null)
      return
    }

    const { error: insErr } = await supabase.from("job_swipes").insert({
      student_id: userId,
      job_id: jobId,
      direction: "right",
    })
    if (insErr) {
      toast({
        variant: "destructive",
        title: "Could not finish apply",
        description: insErr.message,
      })
      setBusy(null)
      void router.refresh()
      return
    }

    toast({ title: "Applied", description: jobTitle })
    setBusy(null)
    router.refresh()
  }

  const unsave = async () => {
    setBusy("unsave")
    const supabase = createClient()
    const { error } = await supabase.from("job_swipes").delete().eq("id", swipeId).eq("student_id", userId)
    if (error) {
      toast({ variant: "destructive", title: "Could not remove", description: error.message })
      setBusy(null)
      return
    }
    toast({ title: "Removed from saved" })
    setBusy(null)
    router.refresh()
  }

  return (
    <div className="flex w-full flex-wrap items-center justify-end gap-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="rounded-full text-muted-foreground hover:text-destructive"
        onClick={() => void unsave()}
        disabled={busy !== null}
        aria-label="Remove from saved"
      >
        {busy === "unsave" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4" />
        )}
        <span className="ml-1.5 hidden sm:inline">Remove</span>
      </Button>
      <Button asChild variant="outline" size="sm" className="rounded-full">
        <Link href={`/jobs/${jobId}`}>View role</Link>
      </Button>
      <Button
        type="button"
        size="sm"
        className="rounded-full gap-1.5"
        onClick={() => void apply()}
        disabled={!isActive || busy !== null}
        title={!isActive ? "This listing is closed" : undefined}
      >
        {busy === "apply" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
        Apply
      </Button>
    </div>
  )
}
