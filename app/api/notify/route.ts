import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { emailUser } from "@/lib/email/send"
import { interviewInviteEmail, pipelineUpdateEmail } from "@/lib/email/templates"
import { PIPELINE_STATUSES, type PipelineStatus } from "@/lib/match/fit"

export const runtime = "nodejs"

/**
 * Recruiter-triggered student emails (spec §5.3): pipeline moves and interview invites.
 * The in-app notification is inserted client-side; this route only handles the email,
 * after verifying the caller owns the match.
 */

type Body =
  | { kind: "pipeline"; matchId: string; status: PipelineStatus }
  | { kind: "interview"; matchId: string; message: string }

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Body | null
  if (!body || typeof body.matchId !== "string" || !body.matchId) {
    return NextResponse.json({ error: "matchId required" }, { status: 400 })
  }
  if (body.kind !== "pipeline" && body.kind !== "interview") {
    return NextResponse.json({ error: "kind required" }, { status: 400 })
  }
  if (body.kind === "pipeline" && !PIPELINE_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // RLS scopes this to matches the caller participates in; we still assert they're the recruiter.
  const { data: match } = await supabase
    .from("matches")
    .select("id, student_id, recruiter_id, jobs(title)")
    .eq("id", body.matchId)
    .maybeSingle()
  if (!match || match.recruiter_id !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  let admin
  try {
    admin = createAdminClient()
  } catch {
    // Service role not configured → email silently unavailable.
    return NextResponse.json({ ok: true, outcome: "skipped" })
  }

  const job = Array.isArray(match.jobs) ? match.jobs[0] : match.jobs
  const jobTitle = (job as { title?: string } | null)?.title || "your application"
  const { data: company } = await admin.from("recruiter_profiles").select("company_name").eq("id", user.id).maybeSingle()
  const companyName = company?.company_name ?? null

  const outcome = await emailUser(
    admin,
    match.student_id,
    (name) =>
      body.kind === "pipeline"
        ? pipelineUpdateEmail({ studentName: name, status: body.status, jobTitle, companyName, matchId: match.id })
        : interviewInviteEmail({
            studentName: name,
            jobTitle,
            companyName,
            message: String(body.message || "").slice(0, 2000),
            matchId: match.id,
          }),
    { match_id: match.id, recruiter_id: user.id, kind: body.kind },
  )

  return NextResponse.json({ ok: true, outcome })
}
