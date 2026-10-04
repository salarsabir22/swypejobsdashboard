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

    const { data: convos } = await supabase.from("conversations").select("id")
    const ids = (convos ?? []).map((c) => c.id as string)
    if (!ids.length) {
      return NextResponse.json({ totalUnreadCount: 0, unreadChannels: 0 })
    }

    const { data: mutes } = await supabase
      .from("conversation_mutes")
      .select("conversation_id")
      .eq("user_id", user.id)
    const muted = new Set((mutes ?? []).map((m) => m.conversation_id as string))

    const { data: unread } = await supabase
      .from("messages")
      .select("id, conversation_id")
      .in("conversation_id", ids)
      .eq("is_read", false)
      .neq("sender_id", user.id)

    const audible = (unread ?? []).filter((m) => !muted.has(m.conversation_id as string))
    const unreadChannels = new Set(audible.map((m) => m.conversation_id)).size
    return NextResponse.json({
      totalUnreadCount: audible.length,
      unreadChannels,
    })
  } catch (error) {
    console.error("[api/chat/unread]", error)
    return NextResponse.json({ totalUnreadCount: 0, unreadChannels: 0 })
  }
}
