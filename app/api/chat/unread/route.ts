import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Cap conversation scan — badge does not need the full chat history graph.
    const { data: convos } = await supabase.from("conversations").select("id").limit(100)
    const ids = (convos ?? []).map((c) => c.id as string)
    if (!ids.length) {
      return NextResponse.json(
        { totalUnreadCount: 0, unreadChannels: 0 },
        { headers: { "Cache-Control": "private, max-age=30" } }
      )
    }

    const { data: mutes } = await supabase
      .from("conversation_mutes")
      .select("conversation_id")
      .eq("user_id", user.id)
      .limit(100)
    const muted = new Set((mutes ?? []).map((m) => m.conversation_id as string))
    const audibleIds = ids.filter((id) => !muted.has(id))
    if (!audibleIds.length) {
      return NextResponse.json(
        { totalUnreadCount: 0, unreadChannels: 0 },
        { headers: { "Cache-Control": "private, max-age=30" } }
      )
    }

    // Count only — badge does not need every unread row.
    const { count } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .in("conversation_id", audibleIds)
      .eq("is_read", false)
      .neq("sender_id", user.id)

    return NextResponse.json(
      {
        totalUnreadCount: count ?? 0,
        unreadChannels: 0,
      },
      { headers: { "Cache-Control": "private, max-age=30" } }
    )
  } catch (error) {
    console.error("[api/chat/unread]", error)
    return NextResponse.json({ totalUnreadCount: 0, unreadChannels: 0 })
  }
}
