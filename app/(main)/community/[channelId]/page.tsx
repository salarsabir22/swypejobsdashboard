import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Users } from "lucide-react"
import { ChannelChat } from "@/components/community/ChannelChat"
import { JoinChannelButton } from "./JoinChannelButton"

export default async function ChannelPage({ params }: { params: Promise<{ channelId: string }> }) {
  const { channelId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: channel } = await supabase.from("community_channels").select("*").eq("id", channelId).single()
  if (!channel) notFound()

  const { data: membership } = await supabase
    .from("channel_members")
    .select("user_id")
    .eq("channel_id", channelId)
    .eq("user_id", user.id)
    .maybeSingle()
  const { count: memberCount } = await supabase
    .from("channel_members")
    .select("*", { count: "exact", head: true })
    .eq("channel_id", channelId)
  const isMember = !!membership

  return (
    <div className="flex h-[calc(100dvh-11.25rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm lg:h-[calc(100dvh-10rem)]">
      <div className="z-10 flex shrink-0 items-center gap-3 border-b border-border bg-card px-4 py-3.5">
        <Link
          href="/community"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Back to community"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="font-heading truncate text-sm font-semibold text-foreground">#{channel.name}</p>
          <p className="font-data mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
            <Users className="h-3 w-3 shrink-0" />
            {memberCount ?? 0} members
          </p>
        </div>
        <JoinChannelButton channelId={channelId} isMember={isMember} userId={user.id} />
      </div>

      {isMember ? (
        <ChannelChat channelId={channelId} currentUserId={user.id} />
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-5 p-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-muted/40">
            <Users className="h-7 w-7 text-muted-foreground" />
          </div>
          <div className="max-w-sm space-y-2">
            <h3 className="font-heading text-lg font-semibold text-foreground">#{channel.name}</h3>
            <p className="font-body text-sm text-muted-foreground">
              {channel.description || "Join to view history and post messages."}
            </p>
          </div>
          <JoinChannelButton channelId={channelId} isMember={false} userId={user.id} showLabel />
        </div>
      )}
    </div>
  )
}
