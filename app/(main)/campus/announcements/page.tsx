import { Megaphone } from "lucide-react"
import { campusPageData } from "@/lib/campus/page-data"
import { CampusFrame } from "@/components/campus/CampusFrame"
import { AnnouncementForm } from "@/components/campus/AnnouncementForm"
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState"
import { DashboardPanel } from "@/components/dashboard/DashboardPanel"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/ui/status-badge"
import { createClient } from "@/lib/supabase/server"

export default async function CampusAnnouncementsPage({ searchParams }: { searchParams: Promise<{ campus?: string }> }) {
  const { campus } = await searchParams
  const snapshot = await campusPageData(campus, "view_actions")
  const university = snapshot.access.university || snapshot.attention[0]?.university || "Campus"
  const supabase = await createClient()
  const { data: rows, error } = await supabase
    .from("campus_announcements")
    .select("id, title, audience, requires_ack, created_at")
    .eq("university", university)
    .order("created_at", { ascending: false })
    .limit(20)

  return (
    <CampusFrame snapshot={snapshot} title="Announcements" description="Target students, alumni, or everyone. Required acknowledgement is tracked per person.">
      <DashboardPanel title="Publish">
        <AnnouncementForm university={university} />
      </DashboardPanel>
      <DashboardPanel title="Recent">
        {error ? (
          <DashboardEmptyState
            icon={Megaphone}
            title="Announcements aren’t available yet"
            description="You can draft notices here once this campus workspace is live."
          />
        ) : !rows?.length ? (
          <p className="text-sm text-muted-foreground">No announcements yet. Publish one above.</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border px-4 py-3">
                <p className="text-sm font-medium">{row.title}</p>
                <div className="flex flex-wrap gap-1.5">
                  <StatusBadge value={row.audience} />
                  {row.requires_ack ? <Badge variant="secondary">Needs a reply</Badge> : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </DashboardPanel>
    </CampusFrame>
  )
}
