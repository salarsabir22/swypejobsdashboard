import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdminApi, writeAudit } from "@/lib/admin/api-auth"

export const runtime = "nodejs"

type Action = "approve" | "reject" | "suspend" | "bulk_approve"
type AdminClient = ReturnType<typeof createAdminClient>

async function applyOne(
  admin: AdminClient,
  actorId: string,
  recruiterId: string,
  action: "approve" | "reject" | "suspend",
  reason?: string | null,
  notes?: string | null,
) {
  const approved = action === "approve"
  const { data: updated, error: updateError } = await admin
    .from("recruiter_profiles")
    .update({ is_approved: approved })
    .eq("id", recruiterId)
    .select("id, is_approved, company_name")
    .maybeSingle()

  if (updateError) throw new Error(updateError.message)
  if (!updated) throw new Error("Recruiter profile not found.")

  await admin.from("employer_reviews").insert({
    recruiter_id: recruiterId,
    action,
    reason_code: reason || null,
    notes: notes || null,
    reviewed_by: actorId,
  })

  await writeAudit(admin, actorId, action, "employer", recruiterId, {
    reason: reason || null,
    notes: notes || null,
    is_approved: approved,
  })

  return updated
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdminApi("employers")
    if ("error" in auth && auth.error) return auth.error

    const body = (await request.json().catch(() => null)) as {
      recruiterId?: string
      recruiterIds?: string[]
      action?: Action
      reason?: string
      notes?: string
    } | null

    const action = body?.action
    if (!action || !["approve", "reject", "suspend", "bulk_approve"].includes(action)) {
      return NextResponse.json({ error: "action is required." }, { status: 400 })
    }

    const { admin, user } = auth

    if (action === "bulk_approve") {
      const ids = [...new Set((body?.recruiterIds || []).map((id) => id.trim()).filter(Boolean))].slice(0, 40)
      if (!ids.length) {
        return NextResponse.json({ error: "recruiterIds required." }, { status: 400 })
      }

      const results: { id: string; company_name: string | null }[] = []
      const errors: { id: string; error: string }[] = []
      for (const id of ids) {
        try {
          const updated = await applyOne(admin, user!.id, id, "approve", body?.reason || "bulk_verified", body?.notes)
          results.push({ id: updated.id, company_name: updated.company_name })
        } catch (error) {
          errors.push({ id, error: error instanceof Error ? error.message : "failed" })
        }
      }

      await writeAudit(admin, user!.id, "bulk_approve", "employer", "batch", {
        count: results.length,
        failed: errors.length,
      })

      return NextResponse.json({ ok: true, approved: results, errors, action })
    }

    const recruiterId = body?.recruiterId?.trim()
    if (!recruiterId) {
      return NextResponse.json({ error: "recruiterId and action are required." }, { status: 400 })
    }

    const updated = await applyOne(
      admin,
      user!.id,
      recruiterId,
      action as "approve" | "reject" | "suspend",
      body?.reason,
      body?.notes,
    )

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
