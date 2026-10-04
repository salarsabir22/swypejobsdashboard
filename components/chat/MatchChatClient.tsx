"use client"

import { ChatThread } from "@/components/chat/ChatThread"
import type { ChatPeer } from "@/lib/chat/inbox"

export function MatchChatClient({
  conversationId,
  currentUserId,
  peer,
  jobTitle,
  matchId,
}: {
  conversationId: string
  currentUserId: string
  peer: ChatPeer
  jobTitle?: string | null
  matchId?: string | null
}) {
  return (
    <ChatThread
      conversationId={conversationId}
      currentUserId={currentUserId}
      peer={peer}
      jobTitle={jobTitle}
      matchId={matchId}
      backHref="/chat"
    />
  )
}
