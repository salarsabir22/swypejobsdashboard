import { redirect } from "next/navigation"
import { Megaphone } from "lucide-react"
import { getRequestUser } from "@/lib/nav/app-shell-user"
import { belongsToCampus, readStudentCampusMembership } from "@/lib/campus/student-campus"
import { AnnouncementAck } from "@/components/portal/AnnouncementAck"
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState"
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/ui/status-badge"

export default async function AnnouncementsPage() {
  const { supabase, user } = await getRequestUser()
  if (!user) redirect("/login?next=/announcements")

  const student = await readStudentCampusMembership(supabase, user)
  const { data, error } = await supabase
    .from("campus_announcements")
    .select("id, title, body, audience, requires_ack, expires_at, created_at, university")
    .order("created_at", { ascending: false })
    .limit(50)
  const audience = student.isAlumni ? "alumni" : "students"
  const rows = (error ? [] : data || []).filter((row) => {
    if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) return false
    if (!belongsToCampus(row.university, student.university)) return false
    return row.audience === "all" || row.audience === audience
  })
  const { data: acks } = await supabase.from("announcement_acks").select("announcement_id").eq("user_id", user.id)
  const done = new Set((acks || []).map((a) => a.announcement_id))

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <DashboardPageHeader
        eyebrow="Campus"
        title="Announcements"
        description="Required notices stay on Home until you acknowledge them. Career outcome surveys live under Profile."
      />
      {error ? (
        <DashboardEmptyState
          icon={Megaphone}
          title="Announcements aren’t available yet"
          description="Your campus workspace is still being set up. Check Home for anything urgent."
          primaryAction={{ href: "/dashboard", label: "Back to Home" }}
        />
      ) : !rows.length ? (
        <DashboardEmptyState
          icon={Megaphone}
          title="Nothing to review"
          description="When your career office posts a notice or survey, it will appear here."
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.id} className="space-y-3 rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge value={row.audience} />
                    {row.requires_ack ? (
                      <Badge variant={done.has(row.id) ? "success" : "secondary"}>
                        {done.has(row.id) ? "Acknowledged" : "Needs a reply"}
                      </Badge>
                    ) : null}
                  </div>
                  <h2 className="font-heading text-lg font-semibold">{row.title}</h2>
                </div>
                {row.requires_ack ? <AnnouncementAck announcementId={row.id} done={done.has(row.id)} /> : null}
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{row.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
