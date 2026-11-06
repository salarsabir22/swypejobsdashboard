import { Calendar, Plus } from "lucide-react"
import { loadCampusPage } from "@/lib/campus/page-data"
import { canCampus } from "@/lib/campus/rbac"
import { createClient } from "@/lib/supabase/server"
import { eventFormatLabel, parseEventSummary } from "@/lib/campus/event-meta"
import { formatAnnouncementAudience } from "@/lib/campus/announcement-audience"
import { CampusFrame } from "@/components/campus/CampusFrame"
import { EventForm } from "@/components/campus/CampusActions"
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState"
import { DashboardPanel } from "@/components/dashboard/DashboardPanel"
import { StatusBadge } from "@/components/ui/status-badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

export default async function CampusEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ campus?: string; range?: string; from?: string; to?: string; calendar?: string }>
}) {
  const { snapshot } = await loadCampusPage(searchParams, "view_events")
  const params = await searchParams
  const university = snapshot.access.university || snapshot.attention[0]?.university || "Campus"
  // Anyone who can open Events can publish (matches Announcements). Faculty had view-only mutate before.
  const canCreate = canCampus(snapshot.access, "view_events") || canCampus(snapshot.access, "mutate")
  const supabase = await createClient()
  const { data: events } = await supabase
    .from("campus_events")
    .select("id, title, kind, starts_at, summary, location")
    .eq("university", university)
    .order("starts_at", { ascending: true })
    .limit(40)

  const calendarNotice =
    params.calendar === "connected"
      ? "Google Calendar connected. You can schedule virtual events with Meet from the create form."
      : params.calendar === "unconfigured"
        ? "Google Calendar isn’t configured for this workspace yet."
        : params.calendar === "forbidden"
          ? "This account can’t connect Google Calendar."
          : null

  return (
    <CampusFrame
      snapshot={snapshot}
      title="Events & career fairs"
      description="Create fairs, workshops, and info sessions. Set virtual or on-site details, visibility, and optional Google Meet scheduling without leaving SwypeJobs."
      actions={
        canCreate ? (
          <Dialog>
            <DialogTrigger asChild>
              <Button className="rounded-full">
                <Plus className="h-4 w-4" />
                Create event
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
              <DialogHeader>
                <DialogTitle>Create event</DialogTitle>
                <DialogDescription>
                  Title, schedule, format, description, and who should see it — including groups and named invitees.
                </DialogDescription>
              </DialogHeader>
              <EventForm university={university} />
            </DialogContent>
          </Dialog>
        ) : null
      }
    >
      {calendarNotice ? <p className="text-sm text-muted-foreground">{calendarNotice}</p> : null}

      {canCreate ? (
        <DashboardPanel title="Create event" description="Or use the button above to open the full form.">
          <EventForm university={university} />
        </DashboardPanel>
      ) : (
        <DashboardEmptyState
          icon={Calendar}
          title="View only"
          description="Your campus role can browse events, but creating them needs edit access."
        />
      )}

      <DashboardPanel title="Upcoming">
        {events?.length ? (
          <ul className="space-y-2">
            {events
              .filter((row) => !String(row.summary || "").startsWith("INTERNATIONAL_PROGRAM"))
              .map((row) => {
                const { description, meta } = parseEventSummary(row.summary)
                return (
                  <li key={row.id} className="space-y-1 rounded-2xl border border-border px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{row.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {row.starts_at ? new Date(row.starts_at).toLocaleString() : "Date to be announced"}
                          {" · "}
                          {eventFormatLabel(meta.format)}
                          {row.location ? ` · ${row.location}` : ""}
                        </p>
                      </div>
                      <StatusBadge value={row.kind} />
                    </div>
                    <p className="text-[13px] text-muted-foreground">
                      Visibility: {formatAnnouncementAudience(meta.audiences.join(","))}
                      {meta.groupIds.length ? ` · ${meta.groupIds.length} group${meta.groupIds.length === 1 ? "" : "s"}` : ""}
                      {meta.targets.length ? ` · ${meta.targets.length} named invitee${meta.targets.length === 1 ? "" : "s"}` : ""}
                    </p>
                    {description ? <p className="line-clamp-2 text-sm text-muted-foreground">{description}</p> : null}
                  </li>
                )
              })}
          </ul>
        ) : (
          <DashboardEmptyState
            icon={Calendar}
            title="No events yet"
            description="Publish a fair or workshop above. Students will see it on Events when visibility includes them."
          />
        )}
      </DashboardPanel>
    </CampusFrame>
  )
}
