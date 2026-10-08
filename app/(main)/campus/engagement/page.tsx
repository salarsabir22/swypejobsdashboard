import { campusPageData } from "@/lib/campus/page-data"
import { CampusFrame } from "@/components/campus/CampusFrame"
import { BreakdownList } from "@/components/campus/BreakdownList"
import { DashboardFunnel } from "@/components/dashboard/DashboardFunnel"
import { DashboardKpiCard } from "@/components/dashboard/DashboardKpiCard"
import { DashboardPanel } from "@/components/dashboard/DashboardPanel"
import { fmtSourced } from "@/lib/campus/format"
import { FileText, Sparkles, UserCheck, Users } from "lucide-react"

export default async function CampusEngagementPage({ searchParams }: { searchParams: Promise<{ campus?: string }> }) {
  const { campus } = await searchParams
  const snapshot = await campusPageData(campus)

  return (
    <CampusFrame
      snapshot={snapshot}
      title="Student engagement"
      description="Who is on the platform, who is complete, and where the class drops off between signup and offer."
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardKpiCard icon={Users} label="Registered" value={snapshot.engagement.registered} />
        <DashboardKpiCard icon={UserCheck} label="Active this week" value={snapshot.engagement.activeWeek} hint={`${snapshot.engagement.activeMonth} this month`} tone="teal" />
        <DashboardKpiCard icon={Sparkles} label="Inactive" value={snapshot.engagement.inactive} tone="amber" />
        <DashboardKpiCard icon={FileText} label="Profile complete" value={fmtSourced(snapshot.engagement.profileComplete, "pct")} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <DashboardKpiCard icon={FileText} label="Resume uploaded" value={fmtSourced(snapshot.engagement.resumeUploaded, "pct")} />
        <DashboardKpiCard icon={Sparkles} label="Skills filled" value={fmtSourced(snapshot.engagement.skillsFilled, "pct")} tone="teal" />
        <DashboardKpiCard
          icon={Users}
          label="Activity per student"
          value={`${snapshot.engagement.swipesPerStudent} swipes`}
          hint={`${snapshot.engagement.appsPerStudent} apps · ${snapshot.engagement.interviewsPerStudent} interviews`}
        />
      </div>
      <DashboardFunnel title="Drop-off: signup → offer" stages={snapshot.engagement.funnel} />
      <div className="grid gap-4 lg:grid-cols-3">
        <BreakdownList title="By class year" rows={snapshot.engagement.byYear} />
        <BreakdownList title="By major" rows={snapshot.engagement.byMajor} />
        <BreakdownList title="By college / institution type" rows={snapshot.engagement.byCollege} />
      </div>
      <DashboardPanel title="Zero-activity outreach list" description="Registered students with no swipes.">
        {snapshot.engagement.zeroActivity.length === 0 ? (
          <p className="text-[14px] text-muted-foreground">Everyone in this campus has at least one swipe.</p>
        ) : (
          <ul className="divide-y divide-border">
            {snapshot.engagement.zeroActivity.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3 py-2 text-[14px]">
                <span className="truncate">
                  {row.name}
                  <span className="text-muted-foreground"> · {row.major || "No major"} · {row.year || "—"}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </DashboardPanel>
      <DashboardPanel title="Career office feature usage" description="RSVPs, advisor bookings, resume reviews.">
        <p className="text-[14px] text-muted-foreground">
          {snapshot.engagement.rsvps} RSVPs · {snapshot.engagement.appointments} advisor bookings · {snapshot.engagement.resumeReviews} resume reviews
        </p>
      </DashboardPanel>
    </CampusFrame>
  )
}
