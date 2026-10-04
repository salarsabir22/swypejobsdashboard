"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Loader2, UserPlus, UserMinus } from "lucide-react"
import { cn } from "@/lib/utils"

interface Props {
  channelId: string
  isMember: boolean
  userId: string
  showLabel?: boolean
  className?: string
}

export function JoinChannelButton({ channelId, isMember, userId, showLabel, className }: Props) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const toggle = async () => {
    setLoading(true)
    const supabase = createClient()
    if (isMember) {
      await supabase.from("channel_members").delete().eq("channel_id", channelId).eq("user_id", userId)
    } else {
      await supabase.from("channel_members").insert({ channel_id: channelId, user_id: userId })
    }
    router.refresh()
    setLoading(false)
  }

  return (
    <Button
      variant={isMember ? "outline" : "default"}
      size={showLabel ? "default" : "sm"}
      onClick={toggle}
      disabled={loading}
      className={cn(showLabel ? "px-6" : "h-8 px-3 text-xs", className)}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isMember ? (
        <><UserMinus className="h-4 w-4" />{showLabel && "Leave Channel"}</>
      ) : (
        <><UserPlus className="h-4 w-4" />{showLabel ? "Join Channel" : "Join"}</>
      )}
    </Button>
  )
}
