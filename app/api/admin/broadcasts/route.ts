import { NextResponse } from "next/server"
import { requireAdminApi, writeAudit } from "@/lib/admin/api-auth"

export const runtime = "nodejs"

type Segment = "all_students" | "all_recruiters" | "inactive"

const CHUNK = 100
const MAX_RECIPIENTS = 500

export async function POST(request: Request) {
  try {
    const auth = await requireAdminApi("comms")
    if ("error" in auth && auth.error) return auth.error

    const body = (await request.json().catch(() => null)) as {
      title?: string
      body?: string
      segment?: Segment
    } | null

    const title = body?.title?.trim()
    const message = body?.body?.trim()
    const segment = body?.segment
    if (!title || !message || !segment || !["all_students", "all_recruiters", "inactive"].includes(segment)) {
      return NextResponse.json({ error: "title, body, and segment are required." }, { status: 400 })
    }

    const { admin, user } = auth
    let recipientIds: string[] = []

    if (segment === "all_students") {
      const { data } = await admin.from("profiles").select("id").eq("role", "student").limit(MAX_RECIPIENTS)
      recipientIds = (data || []).map((r) => r.id)
    } else if (segment === "all_recruiters") {
      const { data } = await admin.from("profiles").select("id").eq("role", "recruiter").limit(MAX_RECIPIENTS)
      recipientIds = (data || []).map((r) => r.id)
    } else {
      const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
      const { data } = await admin
        .from("profiles")
        .select("id")
        .in("role", ["student", "recruiter"])
        .lt("updated_at", cutoff)
        .limit(MAX_RECIPIENTS)
      recipientIds = (data || []).map((r) => r.id)
    }

    const { data: broadcast, error: insertError } = await admin
      .from("platform_broadcasts")
      .insert({
        channel: "in_app",
        segment,
        title,
        body: message,
        created_by: user!.id,
      })
      .select("id")
      .maybeSingle()

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 400 })

    let delivered = 0
    for (let i = 0; i < recipientIds.length; i += CHUNK) {
      const chunk = recipientIds.slice(i, i + CHUNK)
      const { error } = await admin.from("notifications").insert(
        chunk.map((userId) => ({
          user_id: userId,
          type: "broadcast",
          title,
          body: message,
          data: { segment, broadcast_id: broadcast?.id || null },
        })),
      )
      if (!error) delivered += chunk.length
    }

    await writeAudit(admin, user!.id, "broadcast", "platform_broadcast", broadcast?.id || "unknown", {
      segment,
      recipients: recipientIds.length,
      delivered,
    })

    return NextResponse.json({
      ok: true,
      broadcastId: broadcast?.id,
      recipients: recipientIds.length,
      delivered,
      capped: recipientIds.length >= MAX_RECIPIENTS,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not send broadcast."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
