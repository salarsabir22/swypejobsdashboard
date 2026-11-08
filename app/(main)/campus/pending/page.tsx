import Link from "next/link"
import { loadCampusPage } from "@/lib/campus/page-data"
import { createClient } from "@/lib/supabase/server"
import { CampusFrame } from "@/components/campus/CampusFrame"
import { DashboardPanel } from "@/components/dashboard/DashboardPanel"
import { Button } from "@/components/ui/button"

export default async function CampusPendingPage({ searchParams }: { searchParams: Promise<{ campus?: string; range?: string; from?: string; to?: string }> }) {
  const { snapshot, params } = await loadCampusPage(searchParams, "view_actions")
  const university = snapshot.access.university
  const supabase = await createClient()

  const [{ data: reviews }, { data: invites }, { data: rsvps }] = await Promise.all([
    supabase.from("campus_job_reviews").select("job_id, university, status").limit(200),
    university
      ? supabase.from("employer_invitations").select("id, status").eq("university", university).eq("status", "pending")
      : supabase.from("employer_invitations").select("id, status").eq("status", "pending").limit(80),
    supabase.from("campus_event_rsvps").select("event_id").limit(1),
  ])

  const pendingJobs = (reviews || []).filter(
    (row) => (!university || row.university === university) && (row.status === "pending" || !row.status || row.status === "held")
  ).length
  const pendingEmployers = (invites || []).length
  const attention = snapshot.kpis.needingAttention.value ?? snapshot.attention.length
  const atRisk = snapshot.engagement.atRiskDepartments.length
  const rsvpNote = rsvps === null ? "Event RSVPs aren’t on this workspace yet." : "Open Events to review registrations."

  const queues = [
    { href: "/campus/approvals", title: "Job approvals", count: pendingJobs, detail: "Employer listings waiting for CDC review. Approval is optional per the IoBM source." },
    { href: "/campus/employers", title: "Employer verifications", count: pendingEmployers, detail: "Partnership requests and invited companies." },
    { href: "/campus/jobs", title: "Applications", count: snapshot.engagement.applicationsWeek, detail: "Student applications this week, by hiring stage." },
    { href: "/campus/events", title: "Event registrations", count: snapshot.engagement.rsvps, detail: rsvpNote },
    { href: "/campus/opportunities", title: "International applications", count: 0, detail: "CDC listings for exchange, dual degrees, and scholarships. Applications are logged as they arrive." },
    { href: "/campus/actions", title: "Low-activity alerts", count: attention + atRisk, detail: `${attention} students needing attention · ${atRisk} programmes flagged.` },
  ]

  return (
    <CampusFrame
      snapshot={snapshot}
      title="Pending items"
      description="One queue for employer verifications, job approvals, applications, event registrations, international listings, and low-activity alerts."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {queues.map((row) => (
          <DashboardPanel key={row.href} title={row.title} badge={String(row.count)}>
            <p className="mb-4 text-sm text-muted-foreground">{row.detail}</p>
            <Button asChild size="sm" className="rounded-full">
              <Link href={row.href}>Open</Link>
            </Button>
          </DashboardPanel>
        ))}
      </div>
    </CampusFrame>
  )
}
