import { NextResponse } from "next/server"
import { requireAdminApi, writeAudit } from "@/lib/admin/api-auth"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const auth = await requireAdminApi("integrations")
    if ("error" in auth && auth.error) return auth.error

    const body = (await request.json().catch(() => null)) as {
      action?: "create" | "toggle"
      webhookId?: string
      name?: string
      url?: string
      isActive?: boolean
    } | null

    const { admin, user } = auth
    const action = body?.action

    if (action === "create") {
      const name = body?.name?.trim()
      const url = body?.url?.trim()
      if (!name || !url) return NextResponse.json({ error: "name and url required." }, { status: 400 })
      let parsed: URL
      try {
        parsed = new URL(url)
      } catch {
        return NextResponse.json({ error: "Valid https URL required." }, { status: 400 })
      }
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        return NextResponse.json({ error: "URL must be http(s)." }, { status: 400 })
      }
      const { data, error } = await admin
        .from("api_webhooks")
        .insert({ name, url, is_active: true })
        .select("id, name, url, is_active, last_error")
        .maybeSingle()
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      await writeAudit(admin, user!.id, "webhook_create", "api_webhook", data!.id, { name, url })
      return NextResponse.json({ ok: true, webhook: data })
    }

    if (action === "toggle") {
      const webhookId = body?.webhookId?.trim()
      if (!webhookId || typeof body?.isActive !== "boolean") {
        return NextResponse.json({ error: "webhookId and isActive required." }, { status: 400 })
      }
      const { data, error } = await admin
        .from("api_webhooks")
        .update({ is_active: body.isActive })
        .eq("id", webhookId)
        .select("id, name, url, is_active, last_error")
        .maybeSingle()
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      if (!data) return NextResponse.json({ error: "Webhook not found." }, { status: 404 })
      await writeAudit(admin, user!.id, body.isActive ? "webhook_on" : "webhook_off", "api_webhook", webhookId)
      return NextResponse.json({ ok: true, webhook: data })
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update webhook."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
