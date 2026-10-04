"use client"

import { useEffect, useRef, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Send, Loader2, Zap } from "lucide-react"
import { formatTime, getInitials, cn } from "@/lib/utils"
import type { ChannelMessage } from "@/types"
import { ChannelChatSkeleton } from "@/components/skeletons"

interface ChannelChatProps {
  channelId: string
  currentUserId: string
}

export function ChannelChat({ channelId, currentUserId }: ChannelChatProps) {
  const [messages, setMessages] = useState<ChannelMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  async function loadMessages() {
    const { data } = await supabase
      .from("channel_messages")
      .select("*, profiles(id, full_name, avatar_url)")
      .eq("channel_id", channelId)
      .order("created_at", { ascending: true })
      .limit(100)
    setMessages((data as unknown as ChannelMessage[]) || [])
    setLoading(false)
  }

  useEffect(() => {
    queueMicrotask(() => {
      void loadMessages()
    })
    const channel = supabase
      .channel(`channel:${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "channel_messages",
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload) => {
          const { data: msgWithProfile } = await supabase
            .from("channel_messages")
            .select("*, profiles(id, full_name, avatar_url)")
            .eq("id", payload.new.id)
            .single()
          if (msgWithProfile) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === msgWithProfile.id)) return prev
              return [...prev, msgWithProfile as unknown as ChannelMessage]
            })
          }
        }
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [channelId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    const content = newMessage.trim()
    if (!content || sending) return
    setSending(true)
    setNewMessage("")

    const optimisticMsg: ChannelMessage = {
      id: `optimistic-${Date.now()}`,
      channel_id: channelId,
      sender_id: currentUserId,
      content,
      created_at: new Date().toISOString(),
      profiles: undefined,
    }
    setMessages((prev) => [...prev, optimisticMsg])

    const { data, error } = await supabase
      .from("channel_messages")
      .insert({ channel_id: channelId, sender_id: currentUserId, content })
      .select("*, profiles(id, full_name, avatar_url)")
      .single()

    if (error) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMsg.id))
      setNewMessage(content)
    } else if (data) {
      setMessages((prev) => prev.map((m) => (m.id === optimisticMsg.id ? (data as unknown as ChannelMessage) : m)))
    }

    setSending(false)
  }

  if (loading) {
    return <ChannelChatSkeleton />
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto bg-muted/15 px-4">
        <div className="space-y-3 py-4">
          {messages.length === 0 && (
            <div className="py-12 text-center">
              <p className="font-body text-sm text-muted-foreground">No messages yet.</p>
            </div>
          )}

          {messages.map((msg, i) => {
            const isOwn = msg.sender_id === currentUserId
            const sender = msg.profiles
            const showSender =
              i === 0 ||
              messages[i - 1].sender_id !== msg.sender_id ||
              new Date(msg.created_at).getTime() - new Date(messages[i - 1].created_at).getTime() > 120000

            return (
              <div key={msg.id} className={cn("flex gap-2.5", isOwn ? "flex-row-reverse" : "flex-row")}>
                {!isOwn && (
                  <Avatar className="mt-1 h-8 w-8 shrink-0 border border-border">
                    <AvatarImage src={sender?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-[10px] font-bold text-primary">
                      {getInitials(sender?.full_name || "?")}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className={cn("flex max-w-[min(75%,420px)] flex-col gap-0.5", isOwn ? "items-end" : "items-start")}>
                  {!isOwn && showSender && (
                    <span className="font-data px-1 text-[10px] tracking-wider text-muted-foreground">
                      {sender?.full_name}
                    </span>
                  )}
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-2.5 font-body text-sm leading-relaxed",
                      isOwn
                        ? "bg-primary text-primary-foreground rounded-br-md shadow-sm"
                        : "rounded-bl-md border border-border bg-card text-foreground shadow-sm"
                    )}
                  >
                    {msg.content}
                  </div>
                  <span className="font-data px-1 text-[10px] text-muted-foreground">{formatTime(msg.created_at)}</span>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      <form onSubmit={sendMessage} className="flex shrink-0 gap-2 border-t border-border bg-card p-3 sm:p-4">
        <Input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Write a message"
          disabled={sending}
          className="h-11 flex-1 rounded-full px-4"
        />
        <Button
          type="submit"
          size="icon"
          className="h-11 w-11 shrink-0 rounded-full"
          disabled={sending || !newMessage.trim()}
          aria-label="Send"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  )
}
