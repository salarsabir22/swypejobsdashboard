import { campusPageData } from "@/lib/campus/page-data"
import { CampusFrame } from "@/components/campus/CampusFrame"
import { EventForm } from "@/components/campus/CampusActions"
import { DashboardKpiCard } from "@/components/dashboard/DashboardKpiCard"
import { DashboardPanel } from "@/components/dashboard/DashboardPanel"
import { fmtSourced } from "@/lib/campus/format"
import { Calendar, ClipboardList, Smile, Users } from "lucide-react"

export default async function CampusOperationsPage({ searchParams }: { searchParams: Promise<{ campus?: string }> }) {
  const { campus } = await searchParams
  const snapshot = await campusPageData(campus)
  const university = snapshot.access.university || "Campus"

  return (
    <CampusFrame
      snapshot={snapshot}
      title="Career office operations"
      description="Advisor load, events, resume reviews, and student satisfaction with the office vs. the product."
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardKpiCard icon={Calendar} label="Advisor appointments" value={snapshot.operations.appointments} />
        <DashboardKpiCard icon={Users} label="No-show rate" value={fmtSourced(snapshot.operations.noShowRate, "pct")} tone="amber" />
        <DashboardKpiCard icon={ClipboardList} label="Resume reviews" value={snapshot.operations.resumeReviews} />
        <DashboardKpiCard icon={Smile} label="NPS · career office" value={fmtSourced(snapshot.operations.npsOffice)} hint={`Platform NPS ${fmtSourced(snapshot.operations.npsPlatform)}`} tone="teal" />
      </div>
      <DashboardPanel title="Wait times & caseload">
        <p className="text-[14px] text-muted-foreground">{snapshot.operations.waitHint}</p>
        <p className="mt-2 text-[14px]">Caseload signal: {fmtSourced(snapshot.operations.caseload)} students in view.</p>
      </DashboardPanel>
      <DashboardPanel title="Events and event-to-hire" description="Career fairs, workshops, info sessions.">
        {snapshot.operations.events.length ? (
          <ul className="space-y-2 text-[14px]">
            {snapshot.operations.events.map((ev) => (
              <li key={ev.id}>
                {ev.title} · {ev.kind} · {ev.rsvps} RSVPs · {ev.hires} attributed hires
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-4 text-[14px] text-muted-foreground">No events yet. Create one to start RSVP tracking.</p>
        )}
        <div className="mt-4 max-w-lg">
          <EventForm university={university} />
        </div>
      </DashboardPanel>
      <DashboardPanel title="ROI per program">
        <p className="text-[14px] text-muted-foreground">
          ROI is event-to-hire from RSVPs marked hired, divided by staff time once appointments are timestamped. Nothing
          is invented when those fields are empty.
        </p>
      </DashboardPanel>
    </CampusFrame>
  )
}
