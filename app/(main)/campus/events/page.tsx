import { Calendar } from "lucide-react"
import { campusPageData } from "@/lib/campus/page-data"
import { canCampus } from "@/lib/campus/rbac"
import { createClient } from "@/lib/supabase/server"
import { CampusFrame } from "@/components/campus/CampusFrame"
import { EventForm } from "@/components/campus/CampusActions"
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState"
import { DashboardPanel } from "@/components/dashboard/DashboardPanel"
import { StatusBadge } from "@/components/ui/status-badge"

export default async function CampusEventsPage({ searchParams }: { searchParams: Promise<{ campus?: string }> }) {
  const { campus } = await searchParams
  const snapshot = await campusPageData(campus, "view_events")
  const university = snapshot.access.university || snapshot.attention[0]?.university || "Campus"
  const supabase = await createClient()
  const { data: events } = await supabase
    .from("campus_events")
    .select("id, title, kind, starts_at, summary")
    .eq("university", university)
    .order("starts_at", { ascending: true })
    .limit(40)

  return (
    <CampusFrame snapshot={snapshot} title="Events & career fairs" description="Create events, manage RSVPs, and run career-fair activity. A dedicated fair ATS is listed for Phase 3 in the IoBM source; this desk is the live RSVP and session list.">
      {canCampus(snapshot.access, "mutate") ? (
        <DashboardPanel title="Create event">
          <EventForm university={university} />
        </DashboardPanel>
      ) : null}
      <DashboardPanel title="Upcoming">
        {events?.length ? (
          <ul className="space-y-2">
            {events.filter((row) => !String((row as { summary?: string }).summary || "").startsWith("INTERNATIONAL_PROGRAM")).map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border px-4 py-3">
                <div>
                  <p className="text-sm font-medium">{row.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {row.starts_at ? new Date(row.starts_at).toLocaleString() : "Date to be announced"}
                  </p>
                </div>
                <StatusBadge value={row.kind} />
              </li>
            ))}
          </ul>
        ) : (
          <DashboardEmptyState
            icon={Calendar}
            title="No events yet"
            description="Publish a fair or workshop above. Students will see it on Events."
          />
        )}
      </DashboardPanel>
    </CampusFrame>
  )
}
