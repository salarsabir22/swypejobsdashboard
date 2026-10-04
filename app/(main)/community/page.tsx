import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Hash, Users, MessageCircle } from "lucide-react"
import { DiscoverHeader, DiscoverStatStrip } from "@/components/discover"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const CATEGORY_META: Record<string, { description: string }> = {
  tech: { description: "Engineering, infrastructure, and developer tools." },
  design: { description: "Product design, UX, and creative work." },
  finance: { description: "Markets, fintech, and investing." },
  marketing: { description: "Growth, brand, and go-to-market." },
  data: { description: "Analytics, data science, and ML." },
  startup: { description: "Founders, funding, and company building." },
  general: { description: "General discussion and introductions." },
  career: { description: "Hiring, interviews, and career progression." },
}

function categoryLabel(slug: string) {
  return slug.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

export default async function CommunityPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: channels } = await supabase
    .from("community_channels")
    .select("*, channel_members(user_id)")
    .order("name")

  const { data: memberships } = await supabase.from("channel_members").select("channel_id").eq("user_id", user.id)

  const joinedIds = new Set(memberships?.map((m) => m.channel_id) || [])

  const totalMembers = (channels || []).reduce((sum, ch) => sum + (ch.channel_members?.length || 0), 0)
  const joinedCount = joinedIds.size

  type Ch = NonNullable<typeof channels>[number]
  const byCategory = (channels || []).reduce((acc: Record<string, Ch[]>, ch) => {
    const cat = ch.category || "general"
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(ch)
    return acc
  }, {})

  for (const cat of Object.keys(byCategory)) {
    byCategory[cat].sort((a, b) => (b.channel_members?.length || 0) - (a.channel_members?.length || 0))
  }

  const categoryCount = Object.keys(byCategory).length
  const allSorted = (channels || []).slice().sort((a, b) => (b.channel_members?.length || 0) - (a.channel_members?.length || 0))
  const topChannel = allSorted[0]
  const channelTotal = channels?.length || 0

  return (
    <div className="space-y-10">
      <DiscoverHeader
        eyebrow="Channels"
        title="Community"
        description={
          <>
            Topic rooms for live discussion. For a public stream, use{" "}
            <Link href="/feed" className="text-primary underline-offset-4 hover:underline">
              Feed
            </Link>
            . {channelTotal} channel{channelTotal !== 1 ? "s" : ""} · {totalMembers} memberships
            {joinedCount > 0 ? <> · {joinedCount} joined</> : null}
          </>
        }
        action={
          joinedCount > 0 ? (
            <Badge variant="secondary" className="rounded-full px-3 py-1 font-data text-[10px] uppercase tracking-wide">
              {joinedCount} member{joinedCount !== 1 ? "s" : ""}
            </Badge>
          ) : null
        }
      />

      {channelTotal > 0 ? (
        <DiscoverStatStrip
          columns={4}
          caption="Counts"
          items={[
            { label: "Channels", value: channelTotal },
            { label: "Memberships", value: totalMembers, sub: "Sum of joins" },
            { label: "Yours", value: joinedCount },
            { label: "Categories", value: categoryCount },
          ]}
        />
      ) : null}

      {topChannel && (topChannel.channel_members?.length || 0) > 1 ? (
        <Link href={`/community/${topChannel.id}`} className="block">
          <Card className="overflow-hidden border-border shadow-sm transition-colors hover:border-border">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="h-4 w-4 shrink-0" />
                <span className="font-data text-[10px] font-medium uppercase tracking-[0.14em]">Largest channel</span>
              </div>
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/5">
                  <Hash className="h-4 w-4 text-primary" />
                </div>
                <p className="font-heading truncate text-base font-semibold text-foreground">#{topChannel.name}</p>
              </div>
              <div className="flex items-center gap-1.5 font-data text-xs text-muted-foreground sm:shrink-0">
                <Users className="h-3.5 w-3.5" />
                {topChannel.channel_members?.length || 0} members
              </div>
            </CardContent>
          </Card>
        </Link>
      ) : null}

      {Object.entries(byCategory).map(([category, chans]) => {
        const meta = CATEGORY_META[category] || { description: "" }
        return (
          <div key={category} className="space-y-4">
            <div className="flex flex-wrap items-start gap-3 border-b border-border pb-3">
              <div className="min-w-0 flex-1">
                <h2 className="font-heading text-sm font-semibold text-foreground">{categoryLabel(category)}</h2>
                {meta.description ? (
                  <p className="font-body mt-1 text-sm text-muted-foreground">{meta.description}</p>
                ) : null}
              </div>
              <span className="font-data text-[10px] text-muted-foreground">
                {chans.length} channel{chans.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
              {chans.map((channel) => {
                const memberCount = channel.channel_members?.length || 0
                const isJoined = joinedIds.has(channel.id)
                const isPopular = memberCount >= 5

                return (
                  <Link key={channel.id} href={`/community/${channel.id}`} className="group block h-full">
                    <Card
                      className={cn(
                        "relative h-full overflow-hidden border-border shadow-sm transition-colors",
                        "hover:border-border hover:bg-muted/20"
                      )}
                    >
                      {isJoined ? (
                        <div className="absolute left-0 top-0 h-full w-0.5 bg-foreground/20" aria-hidden />
                      ) : null}
                      <CardContent className="flex gap-4 p-5">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/30">
                          <Hash className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-heading text-sm font-semibold text-foreground truncate group-hover:text-primary">
                              #{channel.name}
                            </p>
                            {isJoined ? (
                              <Badge variant="secondary" className="font-data text-[9px] uppercase tracking-wide">
                                Joined
                              </Badge>
                            ) : null}
                            {isPopular && !isJoined ? (
                              <Badge variant="outline" className="font-data text-[9px] text-muted-foreground">
                                Active
                              </Badge>
                            ) : null}
                          </div>
                          {channel.description ? (
                            <p className="font-body mt-1 line-clamp-2 text-xs text-muted-foreground">{channel.description}</p>
                          ) : null}
                          <div className="mt-3 flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1 font-data text-[10px] text-muted-foreground">
                              <Users className="h-3 w-3" />
                              {memberCount} member{memberCount !== 1 ? "s" : ""}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          </div>
        )
      })}

      {!channelTotal ? (
        <Card className="border-dashed border-border bg-muted/20 shadow-none">
          <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center sm:py-20">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-muted/30">
              <MessageCircle className="h-7 w-7 text-muted-foreground" strokeWidth={1.5} />
            </div>
            <div className="max-w-md space-y-2">
              <h2 className="font-heading text-lg font-semibold text-foreground">No channels</h2>
              <p className="font-body text-sm leading-relaxed text-muted-foreground">
                None are set up yet. Contact your administrator if you expected to see channels here.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
