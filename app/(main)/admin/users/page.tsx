import { requireAdminModule } from "@/lib/admin/access"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { AdminFrame } from "@/components/admin/AdminFrame"
import { UserModerationPanel } from "@/components/admin/UserModerationPanel"
import { AdminFilterTabs, AdminPagination } from "@/components/admin/AdminPagination"
import { formatDate, getInitials } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import Link from "next/link"

const PAGE_SIZE = 15
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; role?: string; mod?: string }>
}) {
  const admin = await requireAdminModule("users")
  const { q, page: pageParam, role: roleParam, mod: modParam } = await searchParams
  const page = Math.max(1, Number.parseInt(pageParam || "1", 10) || 1)
  const role =
    roleParam === "student" || roleParam === "recruiter" || roleParam === "university" || roleParam === "admin"
      ? roleParam
      : "all"
  const mod =
    modParam === "warned" || modParam === "suspended" || modParam === "banned" || modParam === "active"
      ? modParam
      : "all"
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1
  const queryText = q?.trim() || ""

  const supabase = await createClient()

  let modUserIds: string[] | null = null
  if (mod === "warned" || mod === "suspended" || mod === "banned") {
    const { data } = await supabase.from("user_moderation").select("user_id").eq("status", mod).limit(500)
    modUserIds = (data || []).map((r) => r.user_id)
  } else if (mod === "active") {
    const { data } = await supabase
      .from("user_moderation")
      .select("user_id")
      .in("status", ["warned", "suspended", "banned"])
      .limit(2000)
    modUserIds = (data || []).map((r) => r.user_id)
  }

  let searchIds: string[] | null = null
  if (queryText.includes("@")) {
    try {
      const adminClient = createAdminClient()
      const email = queryText.toLowerCase()
      const { data: listed } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 200 })
      searchIds = (listed?.users || [])
        .filter((u) => u.email?.toLowerCase() === email || u.email?.toLowerCase().includes(email))
        .map((u) => u.id)
        .slice(0, 50)
    } catch {
      searchIds = []
    }
  } else if (queryText && !UUID_RE.test(queryText)) {
    const [{ data: byName }, { data: byUni }] = await Promise.all([
      supabase.from("profiles").select("id").ilike("full_name", `%${queryText}%`).limit(100),
      supabase.from("student_profiles").select("id").ilike("university", `%${queryText}%`).limit(100),
    ])
    searchIds = [
      ...new Set([...(byName || []).map((r) => r.id), ...(byUni || []).map((r) => r.id)]),
    ]
  }

  let query = supabase
    .from("profiles")
    .select("id, full_name, role, avatar_url, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to)

  if (UUID_RE.test(queryText)) query = query.eq("id", queryText)
  else if (searchIds) {
    if (!searchIds.length) {
      return (
        <AdminFrame
          title="Student / user management"
          description="Search by name, email, university, or user id. Filter by role and moderation status."
          staffRole={admin.staffRole}
        >
          <p className="text-[14px] text-muted-foreground">No users matched “{queryText}”.</p>
        </AdminFrame>
      )
    }
    query = query.in("id", searchIds)
  }
  if (role !== "all") query = query.eq("role", role)
  if (mod === "warned" || mod === "suspended" || mod === "banned") {
    if (!modUserIds?.length) {
      return (
        <AdminFrame
          title="Student / user management"
          description="Search by name or user id, filter by role and moderation status."
          staffRole={admin.staffRole}
        >
          <p className="text-[14px] text-muted-foreground">No users with status “{mod}”.</p>
        </AdminFrame>
      )
    }
    query = query.in("id", modUserIds)
  } else if (mod === "active" && modUserIds?.length) {
    query = query.not("id", "in", `(${modUserIds.join(",")})`)
  }

  const { data: profiles, count } = await query
  const ids = (profiles || []).map((p) => p.id)
  const [{ data: students }, { data: moderation }] = await Promise.all([
    ids.length
      ? supabase.from("student_profiles").select("id, university, graduation_year, resume_url").in("id", ids)
      : Promise.resolve({
          data: [] as { id: string; university: string | null; graduation_year: number | null; resume_url: string | null }[],
        }),
    ids.length
      ? supabase.from("user_moderation").select("user_id, status").in("user_id", ids)
      : Promise.resolve({ data: [] as { user_id: string; status: string }[] }),
  ])

  const studentMap = new Map((students || []).map((s) => [s.id, s]))
  const modMap = new Map((moderation || []).map((m) => [m.user_id, m.status]))
  const total = count || 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const hrefFor = (nextPage: number, nextRole = role, nextQ = queryText, nextMod = mod) => {
    const params = new URLSearchParams()
    if (nextRole !== "all") params.set("role", nextRole)
    if (nextMod !== "all") params.set("mod", nextMod)
    if (nextQ.trim()) params.set("q", nextQ.trim())
    if (nextPage > 1) params.set("page", String(nextPage))
    const qs = params.toString()
    return qs ? `/admin/users?${qs}` : "/admin/users"
  }

  return (
    <AdminFrame
      title="Student / user management"
      description="Search by name, email, university, or user id. Filter by role and moderation status."
      staffRole={admin.staffRole}
    >
      <form className="flex max-w-lg gap-2" action="/admin/users">
        {role !== "all" ? <input type="hidden" name="role" value={role} /> : null}
        {mod !== "all" ? <input type="hidden" name="mod" value={mod} /> : null}
        <Input name="q" defaultValue={queryText} placeholder="Name, email, university, or user id" className="flex-1" />
        <Button type="submit" className="rounded-full">
          Search
        </Button>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <AdminFilterTabs
          current={role}
          tabs={[
            { value: "all", label: "All" },
            { value: "student", label: "Students" },
            { value: "recruiter", label: "Recruiters" },
            { value: "university", label: "University" },
            { value: "admin", label: "Admins" },
          ]}
          hrefFor={(value) => hrefFor(1, value, queryText, mod)}
        />
        <p className="text-[13px] text-muted-foreground">
          {total} user{total === 1 ? "" : "s"}
        </p>
      </div>

      <AdminFilterTabs
        current={mod}
        tabs={[
          { value: "all", label: "Any status" },
          { value: "active", label: "Active" },
          { value: "warned", label: "Warned" },
          { value: "suspended", label: "Suspended" },
          { value: "banned", label: "Banned" },
        ]}
        hrefFor={(value) => hrefFor(1, role, queryText, value)}
      />

      <div className="overflow-x-auto rounded-2xl border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>School / year</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Moderation</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(profiles || []).length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                  No users on this page.
                </TableCell>
              </TableRow>
            ) : (
              (profiles || []).map((profile) => {
                const stu = studentMap.get(profile.id)
                return (
                  <TableRow key={profile.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={profile.avatar_url || undefined} />
                          <AvatarFallback>{getInitials(profile.full_name || "?")}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm">{profile.full_name || "—"}</p>
                          <p className="truncate font-mono text-[10px] text-muted-foreground">{profile.id}</p>
                        </div>
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
                      <Button asChild size="sm" variant="outline" className="rounded-full">
                        <Link href={profile.role === "recruiter" ? `/company/${profile.id}` : `/candidates/${profile.id}`}>
                          View as
                        </Link>
                      </Button>
                      <UserModerationPanel userId={profile.id} initialStatus={modMap.get(profile.id)} />
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <AdminPagination page={page} totalPages={totalPages} hrefFor={(p) => hrefFor(p)} />
    </AdminFrame>
  )
}
