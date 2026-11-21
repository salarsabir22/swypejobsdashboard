import { redirect } from "next/navigation"
import { Megaphone } from "lucide-react"
import { getRequestUser } from "@/lib/nav/app-shell-user"
import { loadAnnouncementInbox } from "@/lib/campus/announcement-inbox"
import { AnnouncementAck } from "@/components/portal/AnnouncementAck"
import { AnnouncementSeenSync } from "@/components/portal/AnnouncementSeenSync"
import { AnnouncementAudienceBadges } from "@/components/campus/AnnouncementAudienceBadges"
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState"
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader"
import { Badge } from "@/components/ui/badge"

export default async function AnnouncementsPage() {
  const { supabase, user } = await getRequestUser()
  if (!user) redirect("/login?next=/announcements")

  const inbox = await loadAnnouncementInbox(supabase, user)
  const { campusConnected, announcements: rows, acked: done, pending } = inbox
  // Opening the page is the read receipt for notices that don't need a reply.
  const unseenIds = rows.filter((row) => !row.requires_ack && !done.has(row.id)).map((row) => row.id)

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <AnnouncementSeenSync ids={unseenIds} />
      <DashboardPageHeader
        eyebrow="Campus"
        title="Announcements"
        description="Required notices stay on Home until you acknowledge them. Career outcome surveys live under Profile."
      />
      {pending > 0 ? (
        <p className="flex items-center gap-2 font-body text-[13px] text-muted-foreground">
          <Badge variant="secondary" className="font-data text-[10px]">
            {pending} new
          </Badge>
          {inbox.awaitingReply > 0
            ? `${inbox.awaitingReply} need${inbox.awaitingReply === 1 ? "s" : ""} a reply from you.`
            : "Posted by your career office."}
        </p>
      ) : null}
      {!campusConnected ? (
        <DashboardEmptyState
          icon={Megaphone}
          title="Not connected to this career center"
          description="Campus announcements are unavailable while your partnership with this career office is paused. You can still use Discover and apply to network roles."
          primaryAction={{ href: "/discover", label: "Open Discover" }}
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
                    <AnnouncementAudienceBadges audience={row.audience} />
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
