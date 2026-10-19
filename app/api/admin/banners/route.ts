import { NextResponse } from "next/server"
import { requireAdminApi, writeAudit } from "@/lib/admin/api-auth"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const auth = await requireAdminApi("comms")
    if ("error" in auth && auth.error) return auth.error

    const body = (await request.json().catch(() => null)) as {
      action?: "create" | "deactivate"
      bannerId?: string
      message?: string
    } | null

    const { admin, user } = auth
    const action = body?.action

    if (action === "create") {
      const message = body?.message?.trim()
      if (!message) return NextResponse.json({ error: "message required." }, { status: 400 })
      const { data, error } = await admin
        .from("platform_banners")
        .insert({ message, is_active: true, created_by: user!.id })
        .select("id, message, is_active")
        .maybeSingle()
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      await writeAudit(admin, user!.id, "banner_create", "platform_banner", data!.id, { message })
      return NextResponse.json({ ok: true, banner: data })
    }

    if (action === "deactivate") {
      const bannerId = body?.bannerId?.trim()
      if (!bannerId) return NextResponse.json({ error: "bannerId required." }, { status: 400 })
      const { data, error } = await admin
        .from("platform_banners")
        .update({ is_active: false })
        .eq("id", bannerId)
        .select("id, message, is_active")
        .maybeSingle()
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      if (!data) return NextResponse.json({ error: "Banner not found." }, { status: 404 })
      await writeAudit(admin, user!.id, "banner_deactivate", "platform_banner", bannerId)
      return NextResponse.json({ ok: true, banner: data })
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update banner."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
