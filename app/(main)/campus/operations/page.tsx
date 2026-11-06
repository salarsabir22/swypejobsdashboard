import { campusReportData } from "@/lib/campus/page-data"
import { canCampus } from "@/lib/campus/rbac"
import { CampusFrame } from "@/components/campus/CampusFrame"
import { EventForm } from "@/components/campus/CampusActions"
import { DashboardKpiCard } from "@/components/dashboard/DashboardKpiCard"
import { DashboardPanel } from "@/components/dashboard/DashboardPanel"
import { fmtSourced } from "@/lib/campus/format"
import { departmentAlerts } from "@/lib/campus/alerts"
import { Calendar, ClipboardList, Smile, Users } from "lucide-react"

export default async function CampusOperationsPage({
  searchParams,
}: {
  searchParams: Promise<{ campus?: string; range?: string; from?: string; to?: string }>
}) {
  const snapshot = await campusReportData(searchParams)
  const university = snapshot.access.university || "Campus"
  const alerts = departmentAlerts(snapshot.attention)

  return (
    <CampusFrame
      snapshot={snapshot}
      showSources
      title="Career office operations"
      description="Advisor load, events, resume reviews, and student satisfaction with the office vs. the product."
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardKpiCard icon={Calendar} label="Advisor appointments" value={snapshot.operations.appointments} />
        <DashboardKpiCard icon={Users} label="No-show rate" value={fmtSourced(snapshot.operations.noShowRate, "pct")} tone="amber" />
        <DashboardKpiCard icon={ClipboardList} label="Resume reviews" value={snapshot.operations.resumeReviews} />
        <DashboardKpiCard icon={Smile} label="NPS · career office" value={fmtSourced(snapshot.operations.npsOffice)} hint={`Platform NPS ${fmtSourced(snapshot.operations.npsPlatform)}`} tone="teal" />
      </div>
      <DashboardPanel title="At-risk departments" description="Programs with several students who have gone quiet or never applied.">
        {alerts.length ? (
          <ul className="space-y-2 text-[14px]">
            {alerts.map((alert) => (
              <li key={alert.department}>
                <span className="font-medium">{alert.department}</span> · {alert.students} students · {alert.reasons.join("; ")}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[14px] text-muted-foreground">No department has three or more students on the attention list.</p>
        )}
      </DashboardPanel>
      <DashboardPanel title="Wait times & caseload">
        <p className="text-[14px] text-muted-foreground">{snapshot.operations.waitHint}</p>
        <p className="mt-2 text-[14px]">Average wait: {fmtSourced(snapshot.operations.waitHours)} hours. Caseload: {fmtSourced(snapshot.operations.caseload)} students in view.</p>
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
        {canCampus(snapshot.access, "mutate") ? (
          <div className="mt-4 max-w-lg">
            <EventForm university={university} />
          </div>
        ) : null}
      </DashboardPanel>
      <DashboardPanel title="ROI per program" badge={`${fmtSourced(snapshot.operations.programRoi)} hires / event`}>
        <p className="text-[14px] text-muted-foreground">
          Attributed hires from RSVPs marked hired, divided by events. Staff-hour cost stays blank until appointments carry a duration.
        </p>
      </DashboardPanel>
    </CampusFrame>
  )
}
