"use client"

import Link from "next/link"
import { MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { NavUnreadBadge } from "@/components/nav/NavUnreadBadge"
import { useChatUnread } from "@/lib/hooks/use-chat-unread"

export function HeaderChatButton() {
  const unread = useChatUnread()

  return (
    <Button
      asChild
      variant="ghost"
      size="icon"
      className="relative h-9 w-9 rounded-full text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground"
    >
      <Link
        href="/chat"
        aria-label={unread > 0 ? `Messages, ${unread} unread` : "Messages"}
        title="Messages"
      >
        <MessageCircle className="h-[18px] w-[18px]" strokeWidth={1.75} />
        <NavUnreadBadge
          count={unread}
          className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-background"
        />
      </Link>
    </Button>
  )
}
