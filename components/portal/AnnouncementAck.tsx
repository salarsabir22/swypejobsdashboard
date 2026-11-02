"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/lib/hooks/use-toast"
import { Button } from "@/components/ui/button"

export function AnnouncementAck({ announcementId, done }: { announcementId: string; done: boolean }) {
  const { toast } = useToast()
  const [acked, setAcked] = useState(done)
  const [busy, setBusy] = useState(false)

  const ack = async () => {
    setBusy(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setBusy(false)
      return
    }
    const { error } = await supabase.from("announcement_acks").insert({ announcement_id: announcementId, user_id: user.id })
    setBusy(false)
    if (error && !/duplicate|unique/i.test(error.message)) {
      toast({ variant: "destructive", title: "Couldn’t acknowledge", description: error.message })
      return
    }
    setAcked(true)
  }

  if (acked) return <p className="text-[13px] text-muted-foreground">Acknowledged</p>
  return (
    <Button type="button" size="sm" className="rounded-full" loading={busy} onClick={() => void ack()}>
      Acknowledge
    </Button>
  )
}
