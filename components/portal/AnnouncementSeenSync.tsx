"use client"

import { useEffect, useMemo } from "react"
import { createClient } from "@/lib/supabase/client"
import { ANNOUNCEMENTS_READ_EVENT } from "@/lib/hooks/use-announcement-unread"

/**
 * Marks plain (non-acknowledgement) notices as seen once the student opens the
 * list. Announcements that need a reply keep counting until acknowledged.
 */
export function AnnouncementSeenSync({ ids }: { ids: string[] }) {
  const supabase = useMemo(() => createClient(), [])
  const key = ids.join(",")

  useEffect(() => {
    if (!key) return
    let cancelled = false

    const run = async () => {
      const { data } = await supabase.auth.getUser()
      const userId = data.user?.id
      if (!userId || cancelled) return

      let changed = false
      for (const id of key.split(",")) {
        const { error } = await supabase
          .from("announcement_acks")
          .insert({ announcement_id: id, user_id: userId })
        if (!error || /duplicate|unique/i.test(error.message)) changed = true
      }
      if (changed && !cancelled) window.dispatchEvent(new Event(ANNOUNCEMENTS_READ_EVENT))
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [key, supabase])

  return null
}
