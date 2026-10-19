import { NextResponse } from "next/server"
import { requireAdminApi, writeAudit } from "@/lib/admin/api-auth"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const auth = await requireAdminApi("channels")
    if ("error" in auth && auth.error) return auth.error

    const body = (await request.json().catch(() => null)) as {
      action?: "create_channel" | "delete_channel" | "remove_member"
      channelId?: string
      userId?: string
      name?: string
      description?: string
      category?: string
    } | null

    const { admin, user } = auth

    if (body?.action === "create_channel") {
      const name = body.name?.trim().toLowerCase().replace(/\s+/g, "-")
      if (!name) return NextResponse.json({ error: "name required." }, { status: 400 })
      const { data, error } = await admin
        .from("community_channels")
        .insert({
          name,
          description: body.description?.trim() || null,
          category: body.category?.trim() || null,
          created_by: user!.id,
        })
        .select("id, name, description, category")
        .maybeSingle()
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      await writeAudit(admin, user!.id, "create_channel", "community_channel", data!.id, { name })
      return NextResponse.json({ ok: true, channel: data })
    }

    const channelId = body?.channelId?.trim()
    if (!channelId) return NextResponse.json({ error: "channelId required." }, { status: 400 })

    if (body?.action === "delete_channel") {
      await admin.from("channel_members").delete().eq("channel_id", channelId)
      const { error } = await admin.from("community_channels").delete().eq("id", channelId)
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      await writeAudit(admin, user!.id, "delete_channel", "community_channel", channelId)
      return NextResponse.json({ ok: true })
    }

    if (body?.action === "remove_member") {
      const memberId = body.userId?.trim()
      if (!memberId) return NextResponse.json({ error: "userId required." }, { status: 400 })
      const { error } = await admin
        .from("channel_members")
        .delete()
        .eq("channel_id", channelId)
        .eq("user_id", memberId)
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      await writeAudit(admin, user!.id, "remove_member", "community_channel", channelId, { userId: memberId })
      return NextResponse.json({ ok: true, userId: memberId })
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update channel."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
