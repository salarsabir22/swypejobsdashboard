"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

/** Fired after the announcements page marks notices as seen. */
export const ANNOUNCEMENTS_READ_EVENT = "announcements:read"

/** Unread campus announcements — same polling + realtime shape as the chat badge. */
export function useAnnouncementUnread() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return
      try {
        const res = await fetch("/api/announcements/unread", { method: "GET" })
        const data = (await res.json().catch(() => ({}))) as { pending?: number }
        if (!cancelled) setCount(Number(data.pending ?? 0))
      } catch {
        if (!cancelled) setCount(0)
      }
    }

    void load()
    const timer = window.setInterval(() => void load(), 60000)
    const supabase = createClient()
    const channel = supabase
      .channel("announcements-unread-badge")
      .on("postgres_changes", { event: "*", schema: "public", table: "campus_announcements" }, () => {
        void load()
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "announcement_acks" }, () => {
        void load()
      })
      .subscribe()

    const onFocus = () => void load()
    const onVisibility = () => {
      if (document.visibilityState === "visible") void load()
    }
    window.addEventListener("focus", onFocus)
    window.addEventListener(ANNOUNCEMENTS_READ_EVENT, onFocus)
    document.addEventListener("visibilitychange", onVisibility)

    return () => {
      cancelled = true
      window.clearInterval(timer)
      window.removeEventListener("focus", onFocus)
      window.removeEventListener(ANNOUNCEMENTS_READ_EVENT, onFocus)
      document.removeEventListener("visibilitychange", onVisibility)
      void supabase.removeChannel(channel)
    }
  }, [])

  return count
}
