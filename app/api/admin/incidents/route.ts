import { NextResponse } from "next/server"
import { requireAdminApi, writeAudit } from "@/lib/admin/api-auth"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const auth = await requireAdminApi("compliance")
    if ("error" in auth && auth.error) return auth.error

    const body = (await request.json().catch(() => null)) as {
      title?: string
      severity?: string
      status?: string
    } | null

    const title = body?.title?.trim()
    if (!title) return NextResponse.json({ error: "title required." }, { status: 400 })

    const { admin, user } = auth
    const { data, error } = await admin
      .from("incident_log")
      .insert({
        title,
        severity: body?.severity?.trim() || "medium",
        status: body?.status?.trim() || "open",
        created_by: user!.id,
      })
      .select("id, title, severity, status")
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    await writeAudit(admin, user!.id, "incident_create", "incident", data!.id, { title })
    return NextResponse.json({ ok: true, incident: data })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create incident."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
