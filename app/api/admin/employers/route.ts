import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const runtime = "nodejs"

type Action = "approve" | "reject" | "suspend"

async function requireAdminUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: "Sign in required." }, { status: 401 }) }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
  if (profile?.role !== "admin") {
    return { error: NextResponse.json({ error: "Admin access required." }, { status: 403 }) }
  }

  return { user }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdminUser()
    if ("error" in auth && auth.error) return auth.error

    const body = (await request.json().catch(() => null)) as {
      recruiterId?: string
      action?: Action
      reason?: string
      notes?: string
    } | null

    const recruiterId = body?.recruiterId?.trim()
    const action = body?.action
    if (!recruiterId || !action || !["approve", "reject", "suspend"].includes(action)) {
      return NextResponse.json({ error: "recruiterId and action are required." }, { status: 400 })
    }

    const admin = createAdminClient()
    const approved = action === "approve"

    const { data: updated, error: updateError } = await admin
      .from("recruiter_profiles")
      .update({ is_approved: approved })
      .eq("id", recruiterId)
      .select("id, is_approved, company_name")
      .maybeSingle()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 })
    }
    if (!updated) {
      return NextResponse.json({ error: "Recruiter profile not found." }, { status: 404 })
    }

    // Best-effort review + audit rows (tables may be missing in older DBs).
    await admin.from("employer_reviews").insert({
      recruiter_id: recruiterId,
      action,
      reason_code: body?.reason || null,
      notes: body?.notes || null,
      reviewed_by: auth.user!.id,
    })

    await admin.from("platform_audit_log").insert({
      actor_id: auth.user!.id,
      action,
      entity: "employer",
      entity_id: recruiterId,
      meta: { reason: body?.reason || null, notes: body?.notes || null, is_approved: approved },
    })

    return NextResponse.json({
      ok: true,
      recruiterId: updated.id,
      is_approved: updated.is_approved,
      company_name: updated.company_name,
      action,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update employer."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
