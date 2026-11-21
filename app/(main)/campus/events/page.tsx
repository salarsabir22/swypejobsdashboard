import { Calendar, Plus, Users } from "lucide-react"
import { loadCampusPage } from "@/lib/campus/page-data"
import { canCampus } from "@/lib/campus/rbac"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
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

  const eventRows = (events || []).filter((row) => !String(row.summary || "").startsWith("INTERNATIONAL_PROGRAM"))

  // RSVPs per event plus the attendee names, so the CDC can see who is coming.
  const admin = createAdminClient()
  const eventIds = eventRows.map((row) => row.id)
  const { data: rsvpRows } = eventIds.length
    ? await admin
        .from("campus_event_rsvps")
        .select("event_id, student_id, hired_from_event")
        .in("event_id", eventIds)
        .limit(5000)
    : { data: [] as { event_id: string; student_id: string; hired_from_event: boolean | null }[] }
  const rsvpStudentIds = [...new Set((rsvpRows || []).map((row) => row.student_id).filter(Boolean))]
  const { data: rsvpStudents } = rsvpStudentIds.length
    ? await admin.from("profiles").select("id, full_name").in("id", rsvpStudentIds)
    : { data: [] as { id: string; full_name: string | null }[] }
  const nameById = new Map((rsvpStudents || []).map((row) => [row.id, row.full_name]))

  const rsvpsByEvent = new Map<string, { id: string; name: string; hired: boolean }[]>()
  for (const row of rsvpRows || []) {
    const list = rsvpsByEvent.get(row.event_id) || []
    list.push({
      id: row.student_id,
      name: nameById.get(row.student_id) || "Student",
      hired: row.hired_from_event === true,
    })
    rsvpsByEvent.set(row.event_id, list)
  }
  const totalRsvps = (rsvpRows || []).length

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
      showRange={false}
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

      <DashboardPanel
        title="Upcoming"
        badge={`${totalRsvps.toLocaleString()} RSVP${totalRsvps === 1 ? "" : "s"}`}
        description="Each event shows how many students RSVP’d and who they are."
      >
        {eventRows.length ? (
          <ul className="space-y-2">
            {eventRows.map((row) => {
              const { description, meta } = parseEventSummary(row.summary)
              const attendees = rsvpsByEvent.get(row.id) || []
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
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-medium tabular-nums">
                        <Users className="size-3.5" strokeWidth={1.75} />
                        {attendees.length} RSVP{attendees.length === 1 ? "" : "s"}
                      </span>
                      <StatusBadge value={row.kind} />
                    </div>
                  </div>
                  <p className="text-[13px] text-muted-foreground">
                    Visibility: {formatAnnouncementAudience(meta.audiences.join(","))}
                    {meta.groupIds.length ? ` · ${meta.groupIds.length} group${meta.groupIds.length === 1 ? "" : "s"}` : ""}
                    {meta.targets.length ? ` · ${meta.targets.length} named invitee${meta.targets.length === 1 ? "" : "s"}` : ""}
                  </p>
                  {description ? <p className="line-clamp-2 text-sm text-muted-foreground">{description}</p> : null}
                  {attendees.length ? (
                    <details className="text-[13px]">
                      <summary className="cursor-pointer font-medium text-primary">Who’s coming</summary>
                      <ul className="mt-2 flex flex-wrap gap-1.5">
                        {attendees
                          .slice()
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map((attendee) => (
                            <li
                              key={attendee.id}
                              className="rounded-full border border-border px-2.5 py-0.5 text-muted-foreground"
                            >
                              {attendee.name}
                              {attendee.hired ? " · hired" : ""}
                            </li>
                          ))}
                      </ul>
                    </details>
                  ) : (
                    <p className="text-[13px] text-muted-foreground">No RSVPs yet.</p>
                  )}
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
