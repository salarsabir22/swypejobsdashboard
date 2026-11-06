import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { recordProfileView } from "@/lib/engagement"

export const runtime = "nodejs"

/**
 * Recruiter opens a student profile → record the view and notify the candidate.
 * Uses the service role so the student notification isn’t blocked by RLS.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { studentId?: string; jobId?: string | null } | null
  const studentId = body?.studentId?.trim()
  if (!studentId) return NextResponse.json({ error: "studentId required" }, { status: 400 })

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (user.id === studentId) return NextResponse.json({ ok: true, skipped: "self" })

  const { data: viewer } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
  if (viewer?.role !== "recruiter") {
    return NextResponse.json({ error: "Recruiters only." }, { status: 403 })
  }

  const { data: student } = await supabase.from("profiles").select("id, role").eq("id", studentId).maybeSingle()
  if (!student || student.role !== "student") {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  let admin
  try {
    admin = createAdminClient()
  } catch {
    // Fall back to the session client if service role isn’t configured.
    await recordProfileView(supabase, {
      viewerId: user.id,
      studentId,
      jobId: body?.jobId || null,
    })
    return NextResponse.json({ ok: true, outcome: "session" })
  }

  await recordProfileView(admin, {
    viewerId: user.id,
    studentId,
    jobId: body?.jobId || null,
  })
  return NextResponse.json({ ok: true, outcome: "admin" })
}
