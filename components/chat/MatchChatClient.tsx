"use client"

import dynamic from "next/dynamic"
import type { ChatPeer } from "@/lib/chat/inbox"
import { ChatInboxSkeleton } from "@/components/skeletons"

const ChatThread = dynamic(() => import("@/components/chat/ChatThread").then((m) => m.ChatThread), {
  ssr: false,
  loading: () => <ChatInboxSkeleton />,
})

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
