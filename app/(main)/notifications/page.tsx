"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import type { Notification } from "@/types"
import { formatTime } from "@/lib/utils"
import { resolveNotificationPath } from "@/lib/chat-navigation"
import { CheckCircle, XCircle } from "lucide-react"
import { PushOptIn } from "@/components/nav/PushOptIn"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { NotificationListSkeleton } from "@/components/skeletons"

export default function NotificationsPage() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<Notification[]>([])
  const [chatUnreadCount, setChatUnreadCount] = useState(0)

  const unreadCount = useMemo(() => items.filter((n) => !n.is_read).length, [items])

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getUser()
      const user = data.user
      if (!user) {
        setItems([])
        setLoading(false)
        return
      }

      const { data: notifications } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })

      try {
        const res = await fetch("/api/chat/unread")
        const chat = (await res.json().catch(() => ({}))) as { totalUnreadCount?: number }
        setChatUnreadCount(Number(chat.totalUnreadCount ?? 0))
      } catch {
        setChatUnreadCount(0)
      }

      setItems((notifications || []) as Notification[])
      setLoading(false)
    }
    void load()
  }, [supabase])

  const actOnNotification = async (n: Notification) => {
    if (!n.is_read) {
      await supabase.from("notifications").update({ is_read: true }).eq("id", n.id)
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)))
    }

    router.push(await resolveNotificationPath(supabase, n))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-foreground sm:text-[2.25rem]">Pings</h1>
        <p className="mt-1 font-body text-sm text-muted-foreground">
          {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
          {" · "}
          {chatUnreadCount > 0
            ? `${chatUnreadCount} unread chat message${chatUnreadCount > 1 ? "s" : ""}`
            : "No unread chat messages"}
        </p>
        <div className="mt-3">
          <PushOptIn />
        </div>
      </div>

      {loading ? (
        <NotificationListSkeleton />
      ) : items.length === 0 ? (
        <Card>
          <CardHeader className="text-center">
            <CardTitle>No pings yet</CardTitle>
            <CardDescription>Go swipe. Make some noise.</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardContent className="divide-y divide-border p-0">
            {items.map((n) => (
              <Button
                key={n.id}
                type="button"
                variant="ghost"
                onClick={() => void actOnNotification(n)}
                className="h-auto w-full justify-between rounded-none px-5 py-4 text-left"
              >
                <div className="min-w-0">
                  <p className="truncate font-body text-sm text-foreground">{n.title}</p>
                  {n.body && (
                    <p className="mt-1 line-clamp-2 font-body text-xs leading-relaxed text-muted-foreground">{n.body}</p>
                  )}
                  <p className="mt-2 font-data text-[10px] text-muted-foreground">{formatTime(n.created_at)}</p>
                </div>
                {!n.is_read ? (
                  <CheckCircle className="h-4 w-4 shrink-0 text-primary" />
                ) : (
                  <XCircle className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
              </Button>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
