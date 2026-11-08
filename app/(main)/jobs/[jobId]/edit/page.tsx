import dynamic from "next/dynamic"
import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import type { Job } from "@/types"

const JobEditor = dynamic(() => import("@/components/jobs/JobEditor").then((m) => m.JobEditor), {
  loading: () => (
    <div className="mx-auto max-w-3xl space-y-4 p-6 text-sm text-muted-foreground" role="status">
      Loading job editor…
    </div>
  ),
})

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
