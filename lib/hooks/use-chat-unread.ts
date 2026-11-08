"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

export function useChatUnread() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return
      try {
        const res = await fetch("/api/chat/unread", { method: "GET" })
        const data = (await res.json().catch(() => ({}))) as { totalUnreadCount?: number }
        if (!cancelled) setCount(Number(data.totalUnreadCount ?? 0))
      } catch {
        if (!cancelled) setCount(0)
      }
    }

    void load()
    const timer = window.setInterval(() => void load(), 60000)
    const supabase = createClient()
    const channel = supabase
      .channel("chat-unread-badge")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        void load()
      })
      .subscribe()

    const onFocus = () => void load()
    const onVisibility = () => {
      if (document.visibilityState === "visible") void load()
    }
    window.addEventListener("focus", onFocus)
    document.addEventListener("visibilitychange", onVisibility)

    return () => {
      cancelled = true
      window.clearInterval(timer)
      window.removeEventListener("focus", onFocus)
      document.removeEventListener("visibilitychange", onVisibility)
      void supabase.removeChannel(channel)
    }
  }, [])

  return count
}
