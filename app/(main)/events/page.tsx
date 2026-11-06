import { redirect } from "next/navigation"
import { Calendar } from "lucide-react"
import { getRequestUser } from "@/lib/nav/app-shell-user"
import { belongsToCampus, readStudentCampusMembership } from "@/lib/campus/student-campus"
import { eventFormatLabel, eventVisibleToViewer, parseEventSummary } from "@/lib/campus/event-meta"
import { EventRsvpButton } from "@/components/portal/EventRsvpButton"
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState"
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader"
import { StatusBadge } from "@/components/ui/status-badge"
import { humanLabel } from "@/lib/status-label"

export default async function EventsPage() {
  const { supabase, user } = await getRequestUser()
  if (!user) redirect("/login?next=/events")

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
  const membership = await readStudentCampusMembership(supabase, user)
  const university = membership.university
  const campusConnected = membership.campusConnected !== false
  const viewerGroup =
    profile?.role === "recruiter" ? "employers" : membership.isAlumni ? "alumni" : "students"

  const { data, error } = await supabase
    .from("campus_events")
    .select("id, title, kind, summary, location, starts_at, university")
    .order("starts_at", { ascending: true })
  const rows = (error || !campusConnected ? [] : data || []).filter((row) => {
    if (!belongsToCampus(row.university, university)) return false
    if (String(row.summary || "").startsWith("INTERNATIONAL_PROGRAM")) return false
    return eventVisibleToViewer(row.summary, { group: viewerGroup, userId: user.id })
  })

  const { data: rsvps } = await supabase.from("campus_event_rsvps").select("event_id").eq("student_id", user.id)
  const going = new Set((rsvps || []).map((r) => r.event_id))
  const isStudent = profile?.role === "student"

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <DashboardPageHeader
        eyebrow="Campus"
        title="Events"
        description={
          profile?.role === "recruiter"
            ? "Career fairs, employer sessions, and workshops. Request a booth from Partnerships after you’re connected to a campus."
            : "Career fairs, employer sessions, and workshops from your career office."
        }
      />
      {error ? (
        <DashboardEmptyState
          icon={Calendar}
          title="Events aren’t available yet"
          description="Your campus workspace is still being set up. Check back soon, or keep using Discover."
          primaryAction={{ href: "/discover", label: "Go to Discover" }}
        />
      ) : !campusConnected ? (
        <DashboardEmptyState
          icon={Calendar}
          title="Not connected to this career center"
          description="Campus events are unavailable while your partnership with this career office is paused. You can still browse and apply to jobs on Discover."
          primaryAction={{ href: "/discover", label: "Open Discover" }}
        />
      ) : !rows.length ? (
        <DashboardEmptyState
          icon={Calendar}
          title="No upcoming events"
          description="When your career office publishes a fair or workshop, it will show up here."
          primaryAction={{ href: "/discover", label: "Browse roles" }}
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => {
            const { description, meta } = parseEventSummary(row.summary)
            return (
              <li key={row.id} className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-border bg-card p-4">
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge value={row.kind} />
                    <StatusBadge value={eventFormatLabel(meta.format)} />
                  </div>
                  <h2 className="font-heading text-lg font-semibold">{row.title}</h2>
                  {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
                  <p className="text-sm text-muted-foreground">
                    {[row.location, row.starts_at ? new Date(row.starts_at).toLocaleString() : null].filter(Boolean).join(" · ") ||
                      "Date to be announced"}
                  </p>
                  {going.has(row.id) ? <p className="text-sm font-medium text-primary">{humanLabel("going")}</p> : null}
                </div>
                {isStudent ? <EventRsvpButton eventId={row.id} going={going.has(row.id)} /> : null}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
