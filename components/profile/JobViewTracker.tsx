"use client"

import { useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { recordJobView } from "@/lib/engagement"

export function JobViewTracker({
  jobId,
  recruiterId,
  jobTitle,
}: {
  jobId: string
  recruiterId: string
  jobTitle?: string | null
}) {
  useEffect(() => {
    const run = async () => {
      const supabase = createClient()
      const { data } = await supabase.auth.getUser()
      if (!data.user) return
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle()
      if (profile?.role !== "student") return
      await recordJobView(supabase, {
        studentId: data.user.id,
        jobId,
        recruiterId,
        jobTitle,
      })
    }
    void run()
  }, [jobId, recruiterId, jobTitle])
  return null
}
