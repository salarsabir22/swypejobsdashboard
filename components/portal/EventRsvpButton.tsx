"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/lib/hooks/use-toast"
import { Button } from "@/components/ui/button"

export function EventRsvpButton({ eventId, going }: { eventId: string; going: boolean }) {
  const { toast } = useToast()
  const [busy, setBusy] = useState(false)
  const [isGoing, setIsGoing] = useState(going)

  const toggle = async () => {
    setBusy(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setBusy(false)
      toast({ variant: "destructive", title: "Sign in required" })
      return
    }
    if (isGoing) {
      const { error } = await supabase.from("campus_event_rsvps").delete().eq("event_id", eventId).eq("student_id", user.id)
      setBusy(false)
      if (error) toast({ variant: "destructive", title: "Couldn’t update RSVP", description: error.message })
      else setIsGoing(false)
      return
    }
    const { error } = await supabase.from("campus_event_rsvps").upsert({ event_id: eventId, student_id: user.id, status: "going" })
    setBusy(false)
    if (error) toast({ variant: "destructive", title: "Couldn’t RSVP", description: error.message })
    else {
      setIsGoing(true)
      toast({ title: "You’re going" })
    }
  }

  return (
    <Button type="button" size="sm" variant={isGoing ? "secondary" : "default"} className="rounded-full" loading={busy} onClick={() => void toggle()}>
      {isGoing ? "Going" : "RSVP"}
    </Button>
  )
}
