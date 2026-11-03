import { redirect } from "next/navigation"
import { Calendar } from "lucide-react"
import { getRequestUser } from "@/lib/nav/app-shell-user"
import { belongsToCampus, readStudentCampusMembership } from "@/lib/campus/student-campus"
import { EventRsvpButton } from "@/components/portal/EventRsvpButton"
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState"
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader"
import { StatusBadge } from "@/components/ui/status-badge"
import { humanLabel } from "@/lib/status-label"

export default async function EventsPage() {
  const { supabase, user } = await getRequestUser()
  if (!user) redirect("/login?next=/events")

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
  const { university } = await readStudentCampusMembership(supabase, user)

  const { data, error } = await supabase
    .from("campus_events")
    .select("id, title, kind, summary, location, starts_at, university")
    .order("starts_at", { ascending: true })
  const rows = (error ? [] : data || []).filter((row) => belongsToCampus(row.university, university))

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
      ) : !rows.length ? (
        <DashboardEmptyState
          icon={Calendar}
          title="No upcoming events"
          description="When your career office publishes a fair or workshop, it will show up here."
          primaryAction={{ href: "/discover", label: "Browse roles" }}
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-border bg-card p-4">
              <div className="min-w-0 space-y-1.5">
                <StatusBadge value={row.kind} />
                <h2 className="font-heading text-lg font-semibold">{row.title}</h2>
                {row.summary ? <p className="text-sm text-muted-foreground">{row.summary}</p> : null}
                <p className="text-sm text-muted-foreground">
                  {[row.location, row.starts_at ? new Date(row.starts_at).toLocaleString() : null].filter(Boolean).join(" · ") ||
                    "Date to be announced"}
                </p>
                {going.has(row.id) ? <p className="text-sm font-medium text-primary">{humanLabel("going")}</p> : null}
              </div>
              {isStudent ? <EventRsvpButton eventId={row.id} going={going.has(row.id)} /> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
