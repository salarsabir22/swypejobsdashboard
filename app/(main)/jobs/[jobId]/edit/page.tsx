import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import { JobEditor } from "@/components/jobs/JobEditor"
import type { Job } from "@/types"

export default async function EditJobPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: job } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .eq("recruiter_id", user.id)
    .maybeSingle()

  if (!job) notFound()
  return <JobEditor job={job as Job} />
}
