import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { pushJobToMatches } from "@/lib/jobs/push"

export const runtime = "nodejs"

/** Recruiter posts or updates a live job; matching students get an in-app notice. */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { jobId?: string } | null
  const jobId = body?.jobId?.trim()
  if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 })

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: job } = await supabase.from("jobs").select("id, recruiter_id").eq("id", jobId).maybeSingle()
  if (!job || job.recruiter_id !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 })

  try {
    const result = await pushJobToMatches(createAdminClient(), jobId)
    return NextResponse.json({ ok: true, ...result })
  } catch {
    return NextResponse.json({ ok: true, notified: 0 })
  }
}
