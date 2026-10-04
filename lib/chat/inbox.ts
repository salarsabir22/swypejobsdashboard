import { coalesceRelation } from "@/lib/dashboard/relations"
import { getBlockedPeerIds } from "@/lib/moderation/blocks"
import type { SupabaseClient } from "@supabase/supabase-js"

export type ChatPeer = {
  id: string
  full_name: string | null
  avatar_url: string | null
  profilePath?: string | null
}

export type ChatLastMessage = {
  id: string
  content: string
  created_at: string
  sender_id: string
  is_read: boolean
  message_type?: string | null
}

export type InboxConversation = {
  id: string
  matchId: string
  jobTitle: string | null
  peer: ChatPeer
  lastMessage: ChatLastMessage | null
  unreadCount: number
  muted?: boolean
}

type MatchJoin = {
  student_id?: string
  recruiter_id?: string
  jobs?: { title?: string | null } | { title?: string | null }[] | null
}

export async function loadInbox(
  supabase: SupabaseClient,
  userId: string
): Promise<InboxConversation[]> {
  const { data: convos, error } = await supabase
    .from("conversations")
    .select("id, match_id, created_at, matches(student_id, recruiter_id, jobs(title))")
    .order("created_at", { ascending: false })

  if (error || !convos?.length) return []

  const peerIds = new Set<string>()
  const parsed = convos.flatMap((row) => {
    const match = coalesceRelation(row.matches as MatchJoin | MatchJoin[] | null)
    if (!match?.student_id || !match?.recruiter_id) return []
    if (match.student_id !== userId && match.recruiter_id !== userId) return []
    const peerId = match.student_id === userId ? match.recruiter_id : match.student_id
    const peerIsRecruiter = match.student_id === userId
    peerIds.add(peerId)
    const job = coalesceRelation(match.jobs)
    return [
      {
        id: row.id as string,
        matchId: row.match_id as string,
        jobTitle: job?.title ?? null,
        peerId,
        peerIsRecruiter,
        createdAt: row.created_at as string,
      },
    ]
  })

  if (!parsed.length) return []

  const [{ data: profiles }, { data: messages }, blocked, mutesRes] = await Promise.all([
    supabase.from("profiles").select("id, full_name, avatar_url").in("id", [...peerIds]),
    supabase
      .from("messages")
      .select("id, conversation_id, content, created_at, sender_id, is_read, message_type")
      .in(
        "conversation_id",
        parsed.map((c) => c.id)
      )
      .order("created_at", { ascending: false })
      .limit(800),
    getBlockedPeerIds(supabase, userId),
    supabase.from("conversation_mutes").select("conversation_id").eq("user_id", userId),
  ])

  const mutedIds = new Set((mutesRes.data || []).map((row) => row.conversation_id as string))

  const profileById = new Map((profiles ?? []).map((p) => [p.id as string, p as ChatPeer]))
  const lastByConvo = new Map<string, ChatLastMessage>()
  const unreadByConvo = new Map<string, number>()

  for (const msg of messages ?? []) {
    const conversationId = msg.conversation_id as string
    if (!lastByConvo.has(conversationId)) {
      lastByConvo.set(conversationId, {
        id: msg.id as string,
        content: msg.content as string,
        created_at: msg.created_at as string,
        sender_id: msg.sender_id as string,
        is_read: Boolean(msg.is_read),
        message_type: (msg as { message_type?: string | null }).message_type ?? "text",
      })
    }
    if (!msg.is_read && msg.sender_id !== userId) {
      unreadByConvo.set(conversationId, (unreadByConvo.get(conversationId) ?? 0) + 1)
    }
  }

  return parsed
    .filter((row) => !blocked.has(row.peerId))
    .map((row) => ({
      id: row.id,
      matchId: row.matchId,
      jobTitle: row.jobTitle,
      peer: {
        ...(profileById.get(row.peerId) ?? { id: row.peerId, full_name: null, avatar_url: null }),
        profilePath: row.peerIsRecruiter ? `/company/${row.peerId}` : `/candidates/${row.peerId}`,
      },
      lastMessage: lastByConvo.get(row.id) ?? null,
      unreadCount: mutedIds.has(row.id) ? 0 : unreadByConvo.get(row.id) ?? 0,
      muted: mutedIds.has(row.id),
    }))
    .sort((a, b) => {
      const aTime = a.lastMessage?.created_at || parsed.find((p) => p.id === a.id)?.createdAt || ""
      const bTime = b.lastMessage?.created_at || parsed.find((p) => p.id === b.id)?.createdAt || ""
      return bTime.localeCompare(aTime)
    })
}

export function previewText(
  content: string | null | undefined,
  senderId: string,
  currentUserId: string,
  messageType?: string | null
) {
  const body =
    messageType === "voice"
      ? "Voice message"
      : messageType === "image"
        ? content?.trim() && content.trim() !== "Photo"
          ? `Photo · ${content.trim()}`
          : "Photo"
        : messageType === "video"
          ? content?.trim() && content.trim() !== "Video"
            ? `Video · ${content.trim()}`
            : "Video"
          : messageType === "audio"
            ? "Audio"
            : messageType === "file"
              ? content?.trim() || "File"
              : content?.trim() || "No messages yet"
  if (messageType === "text" && !content?.trim()) return "No messages yet"
  if (!messageType && !content?.trim()) return "No messages yet"
  if (senderId === currentUserId) return `You: ${body}`
  return body
}
