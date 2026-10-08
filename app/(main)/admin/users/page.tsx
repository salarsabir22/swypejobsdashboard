import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatDate, getInitials } from "@/lib/utils"
import { Users, GraduationCap, Building2, Shield, TrendingUp, Calendar, ArrowRight } from "lucide-react"
import Link from "next/link"

/** Cutoff for “new this week” - computed once per server module load, not per React render. */
const WEEK_AGO_ISO = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

export default async function AdminUsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: currentProfile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (currentProfile?.role !== "admin") redirect("/discover")

  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false })

  const students = (profiles || []).filter(p => p.role === "student")
  const recruiters = (profiles || []).filter(p => p.role === "recruiter")
  const admins = (profiles || []).filter(p => p.role === "admin")

  // Signups in last 7 days
  const newThisWeek = (profiles || []).filter(p => p.created_at > WEEK_AGO_ISO).length

  const roleBadge = (role: string) => {
    if (role === "admin") return "secondary" as const
    if (role === "recruiter") return "default" as const
    return "outline" as const
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-semibold sm:text-[2.25rem]">User Management</h1>
          <p className="font-body text-sm text-muted-foreground">{profiles?.length || 0} total users</p>
        </div>
        <Button asChild variant="ghost">
          <Link href="/admin">← Overview</Link>
        </Button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Users", value: profiles?.length || 0, icon: Users },
          { label: "Students", value: students.length, icon: GraduationCap },
          { label: "Recruiters", value: recruiters.length, icon: Building2 },
          { label: "New This Week", value: newThisWeek, icon: TrendingUp },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <CardDescription>{label}</CardDescription>
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <CardTitle className="text-2xl">{value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Role composition bar */}
      {(profiles?.length || 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">User Composition</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
          <div className="flex h-2.5 rounded-full overflow-hidden gap-0.5">
            {students.length > 0 && (
              <div
                className="bg-[#94A3B8] h-full rounded-l-full"
                style={{ width: `${Math.round((students.length / (profiles?.length || 1)) * 100)}%` }}
                title={`Students: ${students.length}`}
              />
            )}
            {recruiters.length > 0 && (
              <div
                className="bg-[#FAFAFA] h-full"
                style={{ width: `${Math.round((recruiters.length / (profiles?.length || 1)) * 100)}%` }}
                title={`Recruiters: ${recruiters.length}`}
              />
            )}
            {admins.length > 0 && (
              <div
                className="bg-[#D4D4D4] h-full rounded-r-full"
                style={{ width: `${Math.round((admins.length / (profiles?.length || 1)) * 100)}%` }}
                title={`Admins: ${admins.length}`}
              />
            )}
          </div>
          <div className="flex items-center gap-4 font-data text-[9px] uppercase tracking-wider text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#94A3B8]" />Students ({students.length})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-primary" />Recruiters ({recruiters.length})
            </span>
            {admins.length > 0 && (
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-muted-foreground" />Admins ({admins.length})
              </span>
            )}
          </div>
          </CardContent>
        </Card>
      )}

      {/* Users table */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm">All Users</CardTitle>
          <CardDescription>Newest first</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="hidden sm:table-cell">Joined</TableHead>
                <TableHead className="hidden md:table-cell">ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles?.map((profile) => (
                <TableRow key={profile.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={profile.avatar_url || undefined} />
                        <AvatarFallback className="text-xs font-bold">
                          {getInitials(profile.full_name || "?")}
                        </AvatarFallback>
                      </Avatar>
                      <p className="max-w-[120px] truncate font-body text-sm font-medium">{profile.full_name || " - "}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={roleBadge(profile.role || "")}>{profile.role || " - "}</Badge>
                  </TableCell>
                  <TableCell className="hidden whitespace-nowrap sm:table-cell">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {formatDate(profile.created_at)}
                    </span>
                  </TableCell>
                  <TableCell className="hidden max-w-[200px] truncate text-muted-foreground md:table-cell">
                    {profile.id}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {!profiles?.length && (
          <div className="space-y-2 py-12 text-center">
            <Users className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="font-body text-sm text-muted-foreground">No users found</p>
          </div>
        )}
        </CardContent>
      </Card>

      {/* Quick nav */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: "Approve Recruiters", href: "/admin/recruiters", icon: Building2 },
          { label: "Manage Channels", href: "/admin/channels", icon: Shield },
          { label: "Back to Overview", href: "/admin", icon: ArrowRight },
        ].map(({ label, href, icon: Icon }) => (
          <Button asChild key={href} variant="outline">
            <Link href={href}>
              <Icon className="h-3.5 w-3.5" />
              {label}
            </Link>
          </Button>
        ))}
      </div>
    </div>
  )
}
