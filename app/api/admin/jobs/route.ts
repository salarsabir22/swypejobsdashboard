import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireAdminApi, writeAudit } from "@/lib/admin/api-auth"
import { emailUserInBackground } from "@/lib/email/send"
import { jobApprovedEmail, jobRejectedEmail } from "@/lib/email/templates"
import { pushJobToMatches } from "@/lib/jobs/push"

export const runtime = "nodejs"

type Action = "approve" | "reject" | "removed" | "featured" | "bulk_approve" | "bulk_offline"
type AdminClient = ReturnType<typeof createAdminClient>

async function applyOne(
  admin: AdminClient,
  actorId: string,
  jobId: string,
  action: "approve" | "reject" | "removed" | "featured",
  flags: string[] = [],
) {
  const isActive = action === "approve" || action === "featured"
  const { data: before } = await admin.from("jobs").select("is_active").eq("id", jobId).maybeSingle()
  const { data: updated, error } = await admin
    .from("jobs")
    .update({ is_active: isActive })
    .eq("id", jobId)
    .select("id, title, is_active, recruiter_id")
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!updated) throw new Error("Job not found.")

  // Email the posting employer when moderation changes visibility.
  if (updated.recruiter_id) {
    if (action === "approve" && before?.is_active !== true) {
      emailUserInBackground(admin, updated.recruiter_id, (name) => jobApprovedEmail({ recruiterName: name, jobTitle: updated.title, jobId }), { job_id: jobId })
      void pushJobToMatches(admin, jobId)
    } else if (action === "reject") {
      emailUserInBackground(
        admin,
        updated.recruiter_id,
        (name) => jobRejectedEmail({ recruiterName: name, jobTitle: updated.title, jobId, flags }),
        { job_id: jobId },
      )
    }
  }

  await admin.from("job_moderation").upsert({
    job_id: jobId,
    status: action === "approve" ? "approved" : action,
    flags,
    reviewed_at: new Date().toISOString(),
    reviewed_by: actorId,
  })

  await writeAudit(admin, actorId, `job_${action}`, "job", jobId, { flags })
  return updated
}

export async function POST(request: Request) {
  try {
    const auth = await requireAdminApi("jobs")
    if ("error" in auth && auth.error) return auth.error

    const body = (await request.json().catch(() => null)) as {
      jobId?: string
      jobIds?: string[]
      action?: Action
      flags?: string[]
    } | null

    const action = body?.action
    if (
      !action ||
      !["approve", "reject", "removed", "featured", "bulk_approve", "bulk_offline"].includes(action)
    ) {
      return NextResponse.json({ error: "action is required." }, { status: 400 })
    }

    const { admin, user } = auth

    if (action === "bulk_approve" || action === "bulk_offline") {
      const ids = [...new Set((body?.jobIds || []).map((id) => id.trim()).filter(Boolean))].slice(0, 40)
      if (!ids.length) return NextResponse.json({ error: "jobIds required." }, { status: 400 })
      const single = action === "bulk_approve" ? "approve" : "removed"
      const ok: string[] = []
      const errors: { id: string; error: string }[] = []
      for (const id of ids) {
        try {
          await applyOne(admin, user!.id, id, single)
          ok.push(id)
        } catch (error) {
          errors.push({ id, error: error instanceof Error ? error.message : "failed" })
        }
      }
      await writeAudit(admin, user!.id, action, "job", "batch", { count: ok.length, failed: errors.length })
      return NextResponse.json({ ok: true, updated: ok, errors, action })
    }

    const jobId = body?.jobId?.trim()
    if (!jobId) return NextResponse.json({ error: "jobId and action are required." }, { status: 400 })

    const updated = await applyOne(
      admin,
      user!.id,
      jobId,
      action as "approve" | "reject" | "removed" | "featured",
      body?.flags || [],
    )

    return NextResponse.json({
      ok: true,
      jobId: updated.id,
      is_active: updated.is_active,
      action,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update job."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
