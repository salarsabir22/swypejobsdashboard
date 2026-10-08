import { requireAdmin } from "@/lib/admin/access"
import { createClient } from "@/lib/supabase/server"
import { AdminFrame } from "@/components/admin/AdminFrame"
import { UserModerationButtons } from "@/components/admin/AdminActions"
import { formatDate, getInitials } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import Link from "next/link"

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const admin = await requireAdmin()
  const { q } = await searchParams
  const supabase = await createClient()
  let query = supabase
    .from("profiles")
    .select("id, full_name, role, avatar_url, created_at")
    .order("created_at", { ascending: false })
    .limit(100)
  if (q?.trim()) query = query.ilike("full_name", `%${q.trim()}%`)
  const { data: profiles } = await query
  const { data: students } = await supabase.from("student_profiles").select("id, university, graduation_year, resume_url")
  const studentMap = new Map((students || []).map((s) => [s.id, s]))

  return (
    <AdminFrame
      title="Student / user management"
      description="Search, suspend, and inspect accounts. View-as opens their public profile and writes an audit row. True session impersonation is not enabled."
      staffRole={admin.staffRole}
    >
      <form className="flex max-w-md gap-2" action="/admin/users">
        <input
          name="q"
          defaultValue={q || ""}
          placeholder="Search name"
          className="h-11 flex-1 rounded-full border border-input bg-white px-4 text-sm"
        />
        <Button type="submit" className="rounded-full">
          Search
        </Button>
      </form>
      <div className="overflow-x-auto rounded-2xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>School / year</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(profiles || []).map((profile) => {
              const stu = studentMap.get(profile.id)
              return (
                <TableRow key={profile.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={profile.avatar_url || undefined} />
                        <AvatarFallback>{getInitials(profile.full_name || "?")}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{profile.full_name || "—"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{profile.role}</Badge>
                  </TableCell>
                  <TableCell className="text-[13px] text-muted-foreground">
                    {stu ? `${stu.university || "—"} · ${stu.graduation_year || "—"}` : "—"}
                    {stu?.resume_url ? " · resume" : ""}
                  </TableCell>
                  <TableCell className="text-[13px] text-muted-foreground">{formatDate(profile.created_at)}</TableCell>
                  <TableCell className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <Button asChild size="sm" variant="outline" className="rounded-full">
                        <Link
                          href={profile.role === "recruiter" ? `/company/${profile.id}` : `/candidates/${profile.id}`}
                        >
                          View as
                        </Link>
                      </Button>
                    </div>
                    <UserModerationButtons userId={profile.id} />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
      <p className="text-[13px] text-muted-foreground">
        GDPR export/delete: support can request a data dump from the user id. Duplicate detection is same email via
        auth — not listed here. Age/minor checks are not collected. Tags (first-gen, international) live in campus
        demographics with consent.
      </p>
    </AdminFrame>
  )
}
