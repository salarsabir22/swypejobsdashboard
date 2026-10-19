import { NextResponse } from "next/server"
import { requireAdminApi, writeAudit } from "@/lib/admin/api-auth"

export const runtime = "nodejs"

type Status = "reviewed" | "dismissed" | "open"

export async function POST(request: Request) {
  try {
    const auth = await requireAdminApi("safety")
    if ("error" in auth && auth.error) return auth.error

    const body = (await request.json().catch(() => null)) as {
      id?: string
      ids?: string[]
      status?: Status
      action?: "bulk_close"
    } | null

    const { admin, user } = auth

    if (body?.action === "bulk_close") {
      const ids = [...new Set((body.ids || []).map((id) => id.trim()).filter(Boolean))].slice(0, 40)
      if (!ids.length) return NextResponse.json({ error: "ids required." }, { status: 400 })
      const status: Status = body.status === "dismissed" ? "dismissed" : "reviewed"
      const { data, error } = await admin
        .from("reports")
        .update({ status, reviewed_at: new Date().toISOString(), reviewed_by: user!.id })
        .in("id", ids)
        .select("id, status")
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      await writeAudit(admin, user!.id, "report_bulk_close", "report", "batch", {
        count: data?.length || 0,
        status,
      })
      return NextResponse.json({ ok: true, updated: data || [], action: "bulk_close" })
    }

    const id = body?.id?.trim()
    const status = body?.status
    if (!id || !status || !["reviewed", "dismissed", "open"].includes(status)) {
      return NextResponse.json({ error: "id and status are required." }, { status: 400 })
    }

    const { data: updated, error } = await admin
      .from("reports")
      .update({ status, reviewed_at: new Date().toISOString(), reviewed_by: user!.id })
      .eq("id", id)
      .select("id, status")
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    if (!updated) return NextResponse.json({ error: "Report not found." }, { status: 404 })

    await writeAudit(admin, user!.id, `report_${status}`, "report", id)
    return NextResponse.json({ ok: true, id: updated.id, status: updated.status })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update report."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
