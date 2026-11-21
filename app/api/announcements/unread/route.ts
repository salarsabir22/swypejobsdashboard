import { NextResponse } from "next/server"
import { loadAnnouncementInbox } from "@/lib/campus/announcement-inbox"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // Only students and alumni see campus notices — skip the inbox queries for everyone else.
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    if (profile?.role !== "student") {
      return NextResponse.json(
        { pending: 0, awaitingReply: 0, campusConnected: false, latest: [] },
        { headers: { "Cache-Control": "private, max-age=60" } }
      )
    }

    const inbox = await loadAnnouncementInbox(supabase, user, { limit: 40 })

    return NextResponse.json(
      {
        pending: inbox.pending,
        awaitingReply: inbox.awaitingReply,
        campusConnected: inbox.campusConnected,
        latest: inbox.announcements
          .filter((row) => !inbox.acked.has(row.id))
          .slice(0, 1)
          .map((row) => ({ id: row.id, title: row.title, created_at: row.created_at })),
      },
      { headers: { "Cache-Control": "private, max-age=30" } }
    )
  } catch (error) {
    console.error("[api/announcements/unread]", error)
    return NextResponse.json({ pending: 0, awaitingReply: 0, campusConnected: false, latest: [] })
  }
}
