"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

export function PushOptIn() {
  const [status, setStatus] = useState<"idle" | "on" | "blocked" | "unsupported">("idle")

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setStatus("unsupported")
      return
    }
    if (Notification.permission === "granted") setStatus("on")
    if (Notification.permission === "denied") setStatus("blocked")
  }, [])

  useEffect(() => {
    if (status !== "on") return
    const supabase = createClient()
    let userId: string | null = null

    const start = async () => {
      const { data } = await supabase.auth.getUser()
      userId = data.user?.id ?? null
      if (!userId) return

      supabase
        .channel(`pings-${userId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
          (payload) => {
            const row = payload.new as { title?: string; body?: string }
            try {
              new Notification(row.title || "swypejobs", { body: row.body || "" })
            } catch {
              /* ignore */
            }
          }
        )
        .subscribe()
    }

    void start()
    return () => {
      void supabase.removeAllChannels()
    }
  }, [status])

  if (status === "unsupported" || status === "blocked") return null

  if (status === "on") {
    return <p className="font-body text-xs text-muted-foreground">Pings are on. We&apos;ll nudge you when something pops off.</p>
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="rounded-full"
      onClick={async () => {
        const result = await Notification.requestPermission()
        setStatus(result === "granted" ? "on" : result === "denied" ? "blocked" : "idle")
      }}
    >
      Turn on pings 🔔
    </Button>
  )
}
