"use client"

import { MessageCircle } from "lucide-react"
import { ICEBREAKERS } from "@/components/chat/chat-helpers"
import { Button } from "@/components/ui/button"
import { ChatInboxSkeleton } from "@/components/skeletons"

export function ChatInboxEmpty() {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 py-12 text-center">
      <p className="font-heading text-lg font-semibold tracking-tight text-foreground">No threads yet</p>
      <p className="mt-2 max-w-[240px] font-body text-sm leading-relaxed text-muted-foreground">
        Match with someone and the conversation lands here.
      </p>
    </div>
  )
}

export function ChatEmptyConversation({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 pb-6 text-center">
      <p className="font-heading text-base font-semibold text-foreground">Start the thread</p>
      <p className="mt-1 max-w-sm font-body text-sm text-muted-foreground">
        No messages yet. Send a line, or pick a starter.
      </p>
      <div className="mt-5 flex w-full max-w-md flex-wrap justify-center gap-2">
        {ICEBREAKERS.map((line) => (
          <Button
            key={line}
            type="button"
            variant="outline"
            onClick={() => onPick(line)}
            className="h-auto max-w-full whitespace-normal rounded-full px-3.5 py-2 text-left text-[13px] leading-snug"
          >
            {line}
          </Button>
        ))}
      </div>
    </div>
  )
}

export function ChatSelectPlaceholder() {
  return (
    <div className="jm-chat flex h-full flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card text-primary">
        <MessageCircle className="h-7 w-7" aria-hidden />
      </div>
      <p className="font-heading text-lg font-semibold tracking-tight text-foreground">Pick a conversation</p>
      <p className="mt-1 max-w-xs font-body text-sm text-muted-foreground">
        Your matches live in the list. Open one to keep the thread going.
      </p>
    </div>
  )
}

export function ChatLoadingState() {
  return <ChatInboxSkeleton />
}

export function ChatErrorState({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center bg-background px-6 text-center">
      <p className="max-w-sm font-body text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
