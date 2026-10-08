"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

export function useChatUnread() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const res = await fetch("/api/chat/unread", { method: "GET" })
        const data = (await res.json().catch(() => ({}))) as { totalUnreadCount?: number }
        if (!cancelled) setCount(Number(data.totalUnreadCount ?? 0))
      } catch {
        if (!cancelled) setCount(0)
      }
    }

    void load()
    const timer = window.setInterval(() => void load(), 20000)
    const supabase = createClient()
    const channel = supabase
      .channel("chat-unread-badge")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        void load()
      })
      .subscribe()

    const onFocus = () => void load()
    window.addEventListener("focus", onFocus)

    return () => {
      cancelled = true
      window.clearInterval(timer)
      window.removeEventListener("focus", onFocus)
      void supabase.removeChannel(channel)
    }
  }, [])

  return count
}
