"use client"

import { useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { recordProfileView } from "@/lib/engagement"

export function ProfileViewTracker({ studentId }: { studentId: string }) {
  useEffect(() => {
    const run = async () => {
      const supabase = createClient()
      const { data } = await supabase.auth.getUser()
      if (!data.user) return
      await recordProfileView(supabase, { viewerId: data.user.id, studentId })
    }
    void run()
  }, [studentId])
  return null
}
