"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import Link from "next/link"
import { Archive, Columns3, LayoutList, MessageCircle, Star, Users } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState"
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader"
import { getInitials, formatDate, cn } from "@/lib/utils"
import { useToast } from "@/lib/hooks/use-toast"
import { PIPELINE_LABEL, PIPELINE_STATUSES, type PipelineStatus } from "@/lib/match/fit"
import { PipelineSkeleton } from "@/components/skeletons"
import { ShowMoreButton, ShowMoreList } from "@/components/ui/show-more-list"

const BOARD_STAGES = ["chatting", "interview", "offer", "hired"] as const satisfies readonly PipelineStatus[]
const STAGE_TAB_LABEL: Record<(typeof BOARD_STAGES)[number] | "archived", string> = {
  chatting: "Chat",
  interview: "Interview",
  offer: "Offer",
  hired: "Hired",
  archived: "Archive",
}

interface OverallStats {
  totalMatches: number
  shortlisted: number
  inConversation: number
  archived: number
}

type MatchRow = {
  id: string
  created_at: string
  is_shortlisted?: boolean
  is_archived?: boolean
  pipeline_status?: string | null
  recruiter_notes?: string | null
  jobs?: { title?: string | null; job_type?: string | null } | null
  profiles?: {
    id?: string
    full_name?: string | null
    avatar_url?: string | null
    bio?: string | null
    student_profiles?:
      | {
          skills?: string[] | null
          university?: string | null
          degree?: string | null
          graduation_year?: number | string | null
        }
      | {
          skills?: string[] | null
          university?: string | null
          degree?: string | null
          graduation_year?: number | string | null
        }[]
      | null
  } | null
  conversations?: { id: string }[] | { id: string } | null
}

type StageTab = (typeof BOARD_STAGES)[number] | "archived"

export function RecruiterMatchesView({ userId }: { userId: string }) {
  const { toast } = useToast()
  const [matches, setMatches] = useState<MatchRow[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"all" | "starred" | "archived">("all")
  const [stage, setStage] = useState<StageTab>("chatting")
  const [layout, setLayout] = useState<"board" | "list">("board")
  const [overallStats, setOverallStats] = useState<OverallStats>({
    totalMatches: 0,
    shortlisted: 0,
    inConversation: 0,
    archived: 0,
  })

  async function loadMatches() {
    const supabase = createClient()
    const { data } = await supabase
      .from("matches")
      .select(`
        *,
        jobs(title, job_type),
        profiles!matches_student_id_fkey(id, full_name, avatar_url, bio, student_profiles(skills, university, degree, graduation_year)),
        conversations(id)
      `)
      .eq("recruiter_id", userId)
      .order("created_at", { ascending: false })

    const all = (data || []) as MatchRow[]
    setMatches(all)
    setOverallStats({
      totalMatches: all.length,
      shortlisted: all.filter((m) => m.is_shortlisted && !m.is_archived).length,
      inConversation: all.filter((m) =>
        Array.isArray(m.conversations)
          ? m.conversations.length > 0
          : !!(m.conversations && typeof m.conversations === "object" && "id" in m.conversations)
      ).length,
      archived: all.filter((m) => m.is_archived).length,
    })
    setLoading(false)
  }

  useEffect(() => {
    queueMicrotask(() => {
      void loadMatches()
    })
  }, [])

  const toggleShortlist = async (matchId: string, current: boolean) => {
    const supabase = createClient()
    await supabase.from("matches").update({ is_shortlisted: !current }).eq("id", matchId)
    setMatches((prev) => prev.map((m) => (m.id === matchId ? { ...m, is_shortlisted: !current } : m)))
    setOverallStats((prev) => ({
      ...prev,
      shortlisted: !current ? prev.shortlisted + 1 : prev.shortlisted - 1,
    }))
    toast({ title: current ? "Removed from shortlist" : "Added to shortlist" })
  }

  const toggleArchive = async (matchId: string, current: boolean) => {
    const supabase = createClient()
    await supabase.from("matches").update({ is_archived: !current }).eq("id", matchId)
    setMatches((prev) => prev.map((m) => (m.id === matchId ? { ...m, is_archived: !current } : m)))
    setOverallStats((prev) => ({
      ...prev,
      archived: !current ? prev.archived + 1 : prev.archived - 1,
    }))
    toast({ title: current ? "Unarchived" : "Archived" })
  }

  const updatePipeline = async (matchId: string, status: PipelineStatus) => {
    const supabase = createClient()
    const { error } = await supabase.from("matches").update({ pipeline_status: status }).eq("id", matchId)
    if (error) {
      toast({ variant: "destructive", title: "Couldn’t update status", description: error.message })
      return
    }
    setMatches((prev) => prev.map((m) => (m.id === matchId ? { ...m, pipeline_status: status } : m)))
  }

  const saveNotes = async (matchId: string, notes: string) => {
    const supabase = createClient()
    const { error } = await supabase.from("matches").update({ recruiter_notes: notes }).eq("id", matchId)
    if (error) {
      toast({ variant: "destructive", title: "Couldn’t save notes", description: error.message })
      return
    }
    setMatches((prev) => prev.map((m) => (m.id === matchId ? { ...m, recruiter_notes: notes } : m)))
  }

  const active = matches.filter((m) => !m.is_archived)
  const shortlisted = matches.filter((m) => m.is_shortlisted && !m.is_archived)
  const archived = matches.filter((m) => m.is_archived)
  const displayed = tab === "all" ? active : tab === "starred" ? shortlisted : archived
  const stageCounts: Record<StageTab, number> = {
    chatting: active.filter((m) => (m.pipeline_status || "chatting") === "chatting").length,
    interview: active.filter((m) => m.pipeline_status === "interview").length,
    offer: active.filter((m) => m.pipeline_status === "offer").length,
    hired: active.filter((m) => m.pipeline_status === "hired").length,
    archived: archived.length,
  }

  const MatchCard = ({ match, compact }: { match: MatchRow; compact?: boolean }) => {
    const profile = match.profiles
    const spRaw = match.profiles?.student_profiles
    const sp = Array.isArray(spRaw) ? spRaw[0] : spRaw
    const convId = Array.isArray(match.conversations)
      ? match.conversations?.[0]?.id
      : match.conversations?.id
    const skills = sp?.skills?.slice(0, 3) || []
    const schoolLine = [sp?.university, sp?.graduation_year].filter(Boolean).join(" · ")
    const status = ((match.pipeline_status as PipelineStatus) || "chatting") as PipelineStatus

    const statusSelect = (
      <Select value={status} onValueChange={(value) => void updatePipeline(match.id, value as PipelineStatus)}>
        <SelectTrigger
          className={cn("rounded-full bg-muted/70 text-xs shadow-none", compact ? "h-8 w-[8.25rem]" : "h-9 w-full sm:w-[180px]")}
          aria-label="Pipeline status"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PIPELINE_STATUSES.map((item) => (
            <SelectItem key={item} value={item}>
              {PIPELINE_LABEL[item]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )

    if (compact) {
      return (
        <div className="flex items-start gap-3 px-3 py-3">
          <Avatar className="h-11 w-11 shrink-0 ring-1 ring-border">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
              {getInitials(profile?.full_name || "?")}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-heading text-[15px] font-semibold tracking-tight text-foreground">
                  {profile?.full_name}
                </p>
                <p className="mt-0.5 truncate font-body text-xs text-muted-foreground">
                  {match.jobs?.title || "Role"}
                  {schoolLine ? ` · ${schoolLine}` : ""}
                </p>
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0"
                onClick={() => toggleShortlist(match.id, !!match.is_shortlisted)}
                aria-label={match.is_shortlisted ? "Remove from shortlist" : "Add to shortlist"}
              >
                <Star className={cn("h-4 w-4", match.is_shortlisted && "fill-primary text-primary")} strokeWidth={1.5} />
              </Button>
            </div>
            <div className="mt-2.5 flex items-center gap-2">
              {statusSelect}
              <Button asChild size="sm" className="h-8 min-w-0 flex-1">
                <Link href={`/chat/${convId || match.id}`}>
                  <MessageCircle className="h-3.5 w-3.5" strokeWidth={1.75} />
                  Message
                </Link>
              </Button>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0"
                onClick={() => toggleArchive(match.id, !!match.is_archived)}
                aria-label={match.is_archived ? "Unarchive" : "Archive"}
              >
                <Archive className="h-4 w-4" strokeWidth={1.5} />
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return (
      <Card>
        <CardContent className="flex items-start gap-4 p-4 sm:p-5">
          <Avatar className="h-12 w-12 shrink-0 ring-1 ring-border">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
              {getInitials(profile?.full_name || "?")}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-heading text-sm font-semibold text-foreground">{profile?.full_name}</p>
                <p className="mt-0.5 truncate font-body text-xs text-muted-foreground">
                  {match.jobs?.title ? `For ${match.jobs.title}` : "Role"}
                </p>
                {schoolLine ? (
                  <p className="mt-1 truncate font-body text-[11px] text-muted-foreground">{schoolLine}</p>
                ) : null}
              </div>
              <time className="shrink-0 font-body text-[11px] tabular-nums text-muted-foreground">
                {formatDate(match.created_at)}
              </time>
            </div>

            {skills.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {skills.map((s: string) => (
                  <Badge key={s} variant="secondary">
                    {s}
                  </Badge>
                ))}
                {(sp?.skills?.length || 0) > 3 && (
                  <Badge variant="outline">+{(sp?.skills?.length || 0) - 3}</Badge>
                )}
              </div>
            ) : null}

            <div className="mt-3 space-y-2">
              {statusSelect}
              <MatchNotes matchId={match.id} initial={match.recruiter_notes || ""} onSave={saveNotes} />
            </div>
          </div>
        </CardContent>

        <CardContent className="flex flex-col gap-3 border-t border-border px-4 pb-4 pt-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex flex-wrap gap-2">
            {match.is_shortlisted ? <Badge>Shortlisted for {match.jobs?.title || "this role"}</Badge> : null}
            {convId ? <Badge variant="outline">In chat</Badge> : null}
            {status !== "chatting" ? <Badge variant="secondary">{PIPELINE_LABEL[status]}</Badge> : null}
          </div>

          <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              size="icon"
              variant={match.is_shortlisted ? "secondary" : "outline"}
              onClick={() => toggleShortlist(match.id, !!match.is_shortlisted)}
              aria-label={match.is_shortlisted ? "Remove from shortlist" : "Add to shortlist"}
            >
              <Star className={cn("h-4 w-4", match.is_shortlisted && "fill-primary text-primary")} strokeWidth={1.5} />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="outline"
              onClick={() => toggleArchive(match.id, !!match.is_archived)}
              aria-label={match.is_archived ? "Unarchive" : "Archive"}
            >
              <Archive className="h-4 w-4" strokeWidth={1.5} />
            </Button>
            {profile?.id ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/candidates/${profile.id}`}>Profile</Link>
              </Button>
            ) : null}
            <Button asChild size="sm">
              <Link href={`/chat/${convId || match.id}`}>Open chat</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const renderStageEmpty = (status: StageTab) => (
    <DashboardEmptyState
      icon={Users}
      title={status === "archived" ? "Nothing archived" : `No one in ${PIPELINE_LABEL[status] || STAGE_TAB_LABEL[status]}`}
      description={
        status === "archived"
          ? "Archive clears your main list without losing history."
          : matches.length === 0
            ? "When you and a candidate both show interest, they appear here."
            : "Move someone here from another stage when you’re ready."
      }
      primaryAction={
        matches.length === 0 && status !== "archived" ? { href: "/discover", label: "Discover candidates" } : undefined
      }
    />
  )

  if (loading) {
    return <PipelineSkeleton />
  }

  return (
    <div className="space-y-5 lg:space-y-8">
      <DashboardPageHeader
        eyebrow="Recruiting"
        title="Pipeline"
        description={
          matches.length === 0
            ? "When you shortlist someone, they land here with the job attached."
            : `${matches.length} candidate${matches.length !== 1 ? "s" : ""} across your roles.`
        }
        action={
          <div className="hidden items-center gap-2 lg:flex">
            <Tabs value={layout} onValueChange={(value) => setLayout(value as typeof layout)}>
              <TabsList className="h-9">
                <TabsTrigger value="board" className="gap-1.5 px-3 text-xs">
                  <Columns3 className="h-3.5 w-3.5" />
                  Board
                </TabsTrigger>
                <TabsTrigger value="list" className="gap-1.5 px-3 text-xs">
                  <LayoutList className="h-3.5 w-3.5" />
                  List
                </TabsTrigger>
              </TabsList>
            </Tabs>
            {overallStats.inConversation > 0 ? (
              <Button asChild>
                <Link href="/chat">Open inbox</Link>
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="hidden gap-3 lg:grid lg:grid-cols-4">
        {[
          { label: "Total", value: overallStats.totalMatches },
          { label: "Shortlisted", value: overallStats.shortlisted },
          { label: "In conversation", value: overallStats.inConversation },
          { label: "Archived", value: overallStats.archived },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardHeader className="p-4 pb-2">
              <CardDescription>{label}</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Tabs value={stage} onValueChange={(value) => setStage(value as StageTab)} className="lg:hidden">
        <div className="sticky top-16 z-10 -mx-4 bg-background/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6">
          <TabsList className="grid h-[3.35rem] w-full grid-cols-5 gap-0.5 rounded-xl p-1">
            {([...BOARD_STAGES, "archived"] as const).map((status) => (
              <TabsTrigger
                key={status}
                value={status}
                className="group min-w-0 flex-col gap-0.5 rounded-lg px-0 py-1 text-[10px] font-medium leading-none sm:text-[11px]"
              >
                <span className="truncate">{STAGE_TAB_LABEL[status]}</span>
                <span className="font-data text-[10px] tabular-nums text-muted-foreground group-data-[state=active]:text-primary">
                  {stageCounts[status]}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        {([...BOARD_STAGES, "archived"] as const).map((status) => {
          const rows =
            status === "archived"
              ? archived
              : active.filter((m) => (m.pipeline_status || "chatting") === status)
          return (
            <TabsContent key={status} value={status} className="mt-3">
              {rows.length === 0 ? (
                renderStageEmpty(status)
              ) : (
                <div className="overflow-hidden rounded-xl border border-border bg-card">
                  <ShowMoreList
                    items={rows}
                    getKey={(m) => m.id}
                    initial={5}
                    step={5}
                    renderItem={(m, index) => (
                      <div className={index > 0 ? "border-t border-border" : undefined}>
                        <MatchCard match={m} compact />
                      </div>
                    )}
                    footer={(remaining, showMore) => (
                      <ShowMoreButton remaining={remaining} onClick={showMore} className="border-t border-border" />
                    )}
                  />
                </div>
              )}
            </TabsContent>
          )
        })}
      </Tabs>

      <div className="hidden space-y-6 lg:block">
        <Tabs value={tab} onValueChange={(value) => setTab(value as typeof tab)}>
          <TabsList className="grid h-auto w-full max-w-md grid-cols-3">
            <TabsTrigger value="all">All ({active.length})</TabsTrigger>
            <TabsTrigger value="starred">Shortlisted ({shortlisted.length})</TabsTrigger>
            <TabsTrigger value="archived">Archived ({archived.length})</TabsTrigger>
          </TabsList>
        </Tabs>

        {!displayed.length ? (
          <DashboardEmptyState
            icon={Users}
            title={tab === "all" ? "No matches yet" : tab === "starred" ? "No shortlisted candidates" : "Nothing archived"}
            description={
              tab === "all"
                ? "When you and a candidate both show interest, they appear here."
                : tab === "starred"
                  ? "Star someone from this list to keep them at the top of your process."
                  : "Archive clears your main list without losing history."
            }
            primaryAction={tab === "all" ? { href: "/discover", label: "Discover candidates" } : undefined}
          />
        ) : layout === "board" && tab !== "archived" ? (
          <div className="grid grid-cols-4 gap-3">
            {BOARD_STAGES.map((status) => {
              const column = displayed.filter((m) => (m.pipeline_status || "chatting") === status)
              return (
                <section key={status} className="min-w-0 rounded-xl bg-muted/50 p-2.5">
                  <div className="mb-2 flex items-center justify-between px-1.5 pt-0.5">
                    <p className="font-data text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {PIPELINE_LABEL[status]}
                    </p>
                    <span className="rounded-full bg-background px-1.5 py-0.5 font-data text-[10px] tabular-nums text-muted-foreground">
                      {column.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {column.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border px-3 py-10 text-center font-body text-xs text-muted-foreground">
                        Empty
                      </div>
                    ) : (
                      <ShowMoreList
                        items={column}
                        getKey={(m) => m.id}
                        initial={4}
                        step={4}
                        renderItem={(m) => (
                          <div className="overflow-hidden rounded-xl border border-border bg-card">
                            <MatchCard match={m} compact />
                          </div>
                        )}
                        footer={(remaining, showMore) => (
                          <ShowMoreButton
                            remaining={remaining}
                            onClick={showMore}
                            className="h-9 rounded-lg bg-background/80 text-xs"
                          />
                        )}
                      />
                    )}
                  </div>
                </section>
              )
            })}
          </div>
        ) : (
          <div className="space-y-3">
            <ShowMoreList
              items={displayed}
              getKey={(m) => m.id}
              initial={6}
              step={6}
              renderItem={(m) => <MatchCard match={m} />}
              footer={(remaining, showMore) => (
                <div className="flex justify-center pt-1">
                  <ShowMoreButton
                    remaining={remaining}
                    onClick={showMore}
                    className="h-10 w-auto rounded-full border border-border px-5"
                  />
                </div>
              )}
            />
          </div>
        )}
      </div>
    </div>
  )
}

function MatchNotes({
  matchId,
  initial,
  onSave,
}: {
  matchId: string
  initial: string
  onSave: (matchId: string, notes: string) => Promise<void>
}) {
  const [value, setValue] = useState(initial)
  return (
    <Textarea
      rows={2}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        if (value !== initial) void onSave(matchId, value)
      }}
      placeholder="Private notes (only you see these)"
      className="min-h-[4.5rem] resize-none text-sm"
    />
  )
}
