import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import Link from "next/link"
import {
  Users, Building2, Hash, Heart, Briefcase, TrendingUp,
  Clock, AlertTriangle, ArrowRight, Zap, MessageCircle
} from "lucide-react"
import { formatDate } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { getInitials } from "@/lib/utils"

type PendingRecruiterRow = {
  id: string
  company_name: string
  profiles?: { full_name?: string | null; created_at?: string | null } | null
}

type RecentUserRow = {
  id: string
  full_name?: string | null
  avatar_url?: string | null
  role?: string | null
  created_at?: string | null
}

export default async function AdminOverviewPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: currentProfile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (currentProfile?.role !== "admin") redirect("/discover")

  // Fetch all platform metrics in parallel
  const [
    profilesRes,
    jobsRes,
    matchesRes,
    channelsRes,
    pendingRecruitersRes,
    recentUsersRes,
  ] = await Promise.all([
    supabase.from("profiles").select("role, created_at"),
    supabase.from("jobs").select("is_active", { count: "exact" }),
    supabase.from("matches").select("id", { count: "exact", head: true }),
    supabase.from("community_channels").select("id, name, channel_members(user_id)"),
    supabase.from("recruiter_profiles").select("id, company_name, is_approved, profiles(full_name, created_at)").eq("is_approved", false).order("created_at", { ascending: false }).limit(5),
    supabase.from("profiles").select("id, full_name, avatar_url, role, created_at").order("created_at", { ascending: false }).limit(8),
  ])

  const allProfiles = profilesRes.data || []
  const students = allProfiles.filter(p => p.role === "student").length
  const recruiters = allProfiles.filter(p => p.role === "recruiter").length
  const admins = allProfiles.filter(p => p.role === "admin").length

  const allJobs = jobsRes.data || []
  const activeJobs = allJobs.filter((j): j is { is_active: boolean } =>
    typeof j === "object" && j !== null && "is_active" in j && (j as { is_active: boolean }).is_active === true
  ).length

  const totalMatches = matchesRes.count || 0
  const totalChannels = (channelsRes.data || []).length
  const totalMembers = (channelsRes.data || []).reduce((sum, ch) => sum + (ch.channel_members?.length || 0), 0)

  const pendingRecruiters = (pendingRecruitersRes.data || []) as PendingRecruiterRow[]
  const recentUsers = (recentUsersRes.data || []) as RecentUserRow[]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="mt-0.5 font-body text-sm text-muted-foreground">
            Platform overview · {allProfiles.length} total users
          </p>
        </div>
        <Badge variant="secondary">Admin</Badge>
      </div>

      {/* Pending approvals alert */}
      {pendingRecruiters.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Action required</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>
              {pendingRecruiters.length} recruiter{pendingRecruiters.length > 1 ? "s" : ""} waiting for approval
            </span>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/recruiters">
                Review <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Platform KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Users", value: allProfiles.length, icon: Users, href: "/admin/users" },
          { label: "Active Jobs", value: activeJobs, icon: Briefcase, href: "/jobs" },
          { label: "Total Matches", value: totalMatches, icon: Heart, href: "/admin/users" },
          { label: "Channels", value: totalChannels, icon: Hash, href: "/admin/channels" },
        ].map(({ label, value, icon: Icon, href }) => (
          <Link key={label} href={href}>
            <Card className="transition hover:border-primary/30">
              <CardHeader className="p-4 pb-2">
                <div className="mb-2 flex items-center justify-between">
                  <CardDescription>{label}</CardDescription>
                  <Icon className="h-3.5 w-3.5 text-primary" />
                </div>
                <CardTitle className="text-2xl">{value}</CardTitle>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      {/* User breakdown + Community stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* User breakdown */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-foreground" />
              <CardDescription className="font-data text-[11px] uppercase tracking-wider">User Breakdown</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm" className="h-auto px-0 font-data text-[9px] uppercase tracking-wider">
              <Link href="/admin/users">Manage →</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Students", value: students, total: allProfiles.length, color: "#94A3B8" },
              { label: "Recruiters", value: recruiters, total: allProfiles.length, color: "#FAFAFA" },
              { label: "Admins", value: admins, total: allProfiles.length, color: "#D4D4D4" },
            ].map(({ label, value, total, color }) => (
              <div key={label} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="font-body text-sm text-muted-foreground">{label}</p>
                  <p className="font-heading font-bold text-sm" style={{ color }}>{value}</p>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{ width: total > 0 ? `${Math.round((value / total) * 100)}%` : "0%", background: color }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-foreground" />
              <CardDescription className="font-data text-[11px] uppercase tracking-wider">Platform Activity</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Total jobs posted", value: allJobs.length, icon: Briefcase },
              { label: "Active job listings", value: activeJobs, icon: Zap },
              { label: "Mutual matches made", value: totalMatches, icon: Heart },
              { label: "Community members", value: totalMembers, icon: MessageCircle },
              { label: "Pending approvals", value: pendingRecruiters.length, icon: Clock },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5 text-primary" />
                  <p className="font-body text-sm text-muted-foreground">{label}</p>
                </div>
                <p className="font-heading text-sm font-bold text-foreground">{value}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {pendingRecruiters.length > 0 && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <CardDescription className="font-data text-[11px] uppercase tracking-wider">Pending Approvals</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm" className="h-auto px-0 font-data text-[9px] uppercase tracking-wider">
              <Link href="/admin/recruiters">View all →</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {pendingRecruiters.map((recruiter) => (
                <div key={recruiter.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                      <Building2 className="h-4 w-4 text-foreground" />
                    </div>
                    <div>
                      <p className="font-body text-sm font-medium text-foreground">{recruiter.company_name}</p>
                      <p className="font-data text-[10px] text-muted-foreground">
                        {recruiter.profiles?.full_name} ·{" "}
                        {recruiter.profiles?.created_at ? formatDate(recruiter.profiles.created_at) : " - "}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">Pending</Badge>
                </div>
              ))}
            </div>
            <Button asChild className="w-full">
              <Link href="/admin/recruiters">
                Review & Approve Recruiters <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden">
        <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-border">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-foreground" />
            <CardDescription className="font-data text-[11px] uppercase tracking-wider">Recent Signups</CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm" className="h-auto px-0 font-data text-[9px] uppercase tracking-wider">
            <Link href="/admin/users">All users →</Link>
          </Button>
        </CardHeader>
        <CardContent className="divide-y divide-border p-0">
          {recentUsers.map((u) => (
            <div key={u.id} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40">
              <Avatar className="h-8 w-8 border border-border">
                <AvatarImage src={u.avatar_url || undefined} />
                <AvatarFallback className="bg-muted text-xs font-bold text-foreground">
                  {getInitials(u.full_name || "?")}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate font-body text-sm text-foreground">{u.full_name || " - "}</p>
                <p className="font-data text-[10px] text-muted-foreground">
                  {u.created_at ? formatDate(u.created_at) : " - "}
                </p>
              </div>
              <Badge variant="secondary">{u.role}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: "Manage Users", desc: "View all accounts, roles, and join dates", href: "/admin/users", icon: Users },
          { label: "Approve Recruiters", desc: "Review and activate recruiter applications", href: "/admin/recruiters", icon: Building2 },
          { label: "Manage Channels", desc: "Create, edit, and delete community channels", href: "/admin/channels", icon: Hash },
        ].map(({ label, desc, href, icon: Icon }) => (
          <Link key={href} href={href}>
            <Card className="h-full transition hover:border-primary/30">
              <CardHeader>
                <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-sm">{label}</CardTitle>
                <CardDescription>{desc}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
