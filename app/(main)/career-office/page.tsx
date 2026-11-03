import Link from "next/link"
import { redirect } from "next/navigation"
import { Building2, Calendar, Handshake, Megaphone } from "lucide-react"
import { getRequestUser } from "@/lib/nav/app-shell-user"
import { loadStudentCampus } from "@/lib/campus/student-campus"
import { EventRsvpButton } from "@/components/portal/EventRsvpButton"
import { AnnouncementAck } from "@/components/portal/AnnouncementAck"
import { Button } from "@/components/ui/button"
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState"
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader"
import { DashboardPanel } from "@/components/dashboard/DashboardPanel"
import { StatusBadge } from "@/components/ui/status-badge"

export default async function StudentCareerOfficePage() {
  const { supabase, user } = await getRequestUser()
  if (!user) redirect("/login?next=/career-office")

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
  if (profile?.role === "university") redirect("/campus")
  if (profile?.role === "recruiter") redirect("/partnerships")

  const { data: student } = await supabase
    .from("student_profiles")
    .select("university, is_alumni")
    .eq("id", user.id)
    .maybeSingle()
  const university = student?.university || null
  const isAlumni = student?.is_alumni === true
  const campus = await loadStudentCampus(supabase, { userId: user.id, university, isAlumni })

  const { data: rsvps } = await supabase.from("campus_event_rsvps").select("event_id").eq("student_id", user.id)
  const going = new Set((rsvps || []).map((r) => r.event_id))
  const { data: acks } = await supabase.from("announcement_acks").select("announcement_id").eq("user_id", user.id)
  const done = new Set((acks || []).map((a) => a.announcement_id))

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <DashboardPageHeader
        eyebrow="Campus"
        title={campus.title}
        description={
          isAlumni
            ? "Jobs, events, advising, and mentorship from your career office — for alumni of this campus."
            : "Jobs, internships, events, and advising from your career office."
        }
        action={
          <Button asChild>
            <Link href="/appointments">Book advising</Link>
          </Button>
        }
      />

      {!university ? (
        <DashboardEmptyState
          icon={Building2}
          title="Add your university"
          description="Finish education onboarding so we can show your career office’s events, notices, and campus jobs."
          primaryAction={{ href: "/onboarding", label: "Complete education" }}
        />
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { href: "/events", label: "Events", icon: Calendar },
          { href: "/announcements", label: "Announcements", icon: Megaphone },
          { href: "/appointments", label: "Advising", icon: Handshake },
          { href: isAlumni ? "/mentorship" : "/internships", label: isAlumni ? "Mentorship" : "Internships", icon: Building2 },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex min-h-11 items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-medium hover:bg-secondary"
          >
            <item.icon className="size-4 shrink-0" aria-hidden />
            {item.label}
          </Link>
        ))}
      </div>

      <DashboardPanel title="Upcoming events" description="Fairs, workshops, and employer sessions from your career office.">
        {!campus.events.length ? (
          <p className="text-sm text-muted-foreground">No upcoming events yet. Check back when the career office publishes one.</p>
        ) : (
          <ul className="space-y-3">
            {campus.events.map((row) => (
              <li key={row.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border px-4 py-3">
                <div className="min-w-0 space-y-1">
                  {row.kind ? <StatusBadge value={row.kind} /> : null}
                  <p className="font-medium">{row.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {[row.location, row.starts_at ? new Date(row.starts_at).toLocaleString() : null]
                      .filter(Boolean)
                      .join(" · ") || "Date to be announced"}
                  </p>
                </div>
                <EventRsvpButton eventId={row.id} going={going.has(row.id)} />
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-sm">
          <Link href="/events" className="text-primary hover:underline">
            All events
          </Link>
        </p>
      </DashboardPanel>

      <DashboardPanel title="Announcements" description="Notices from your career office.">
        {!campus.announcements.length ? (
          <p className="text-sm text-muted-foreground">No notices right now.</p>
        ) : (
          <ul className="space-y-3">
            {campus.announcements.map((row) => (
              <li key={row.id} className="space-y-2 rounded-xl border border-border px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <p className="font-medium">{row.title}</p>
                  {row.requires_ack ? <AnnouncementAck announcementId={row.id} done={done.has(row.id)} /> : null}
                </div>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{row.body}</p>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-sm">
          <Link href="/announcements" className="text-primary hover:underline">
            All announcements
          </Link>
        </p>
      </DashboardPanel>
    </div>
  )
}
