import { Suspense } from "react"
import Link from "next/link"
import {
  Briefcase,
  Building2,
  Calendar,
  Check,
  ClipboardCheck,
  Globe,
  Handshake,
  TrendingUp,
  TriangleAlert,
  UserRound,
  Users,
} from "lucide-react"
import { campusReportData } from "@/lib/campus/page-data"
import { canCampus } from "@/lib/campus/rbac"
import { campusQueryHref } from "@/lib/campus/reports"
import { fmtNum, fmtSourced, pctChange } from "@/lib/campus/format"
import { createClient } from "@/lib/supabase/server"
import { CampusFrame } from "@/components/campus/CampusFrame"
import { CampusHomeKpi } from "@/components/campus/CampusHomeKpi"
import { CampusHomeToolbar } from "@/components/campus/CampusHomeToolbar"
import { CampusTrendChart } from "@/components/campus/CampusTrendChart"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const PANEL = "campus-raised border-0"
const ICON = "campus-chip bg-[rgba(34,81,255,0.1)] text-[#2251FF]"

function eventWhen(iso?: string | null) {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return date.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

export default async function CampusHomePage({
  searchParams,
}: {
  searchParams: Promise<{ campus?: string; range?: string; from?: string; to?: string }>
}) {
  const snapshot = await campusReportData(searchParams, "view_home")
  const canExport = canCampus(snapshot.access, "export")
  const canAct = canCampus(snapshot.access, "view_actions")
  const uni = snapshot.access.university
  const supabase = await createClient()

  const [{ data: reviews }, { data: partners }] = await Promise.all([
    supabase.from("campus_job_reviews").select("job_id, university, status").limit(200),
    uni
      ? supabase.from("campus_employer_partners").select("id, status").eq("university", uni)
      : supabase.from("campus_employer_partners").select("id, status").limit(80),
  ])

  const pendingJobs = (reviews || []).filter(
    (row) => (!uni || row.university === uni) && (row.status === "pending" || !row.status || row.status === "held")
  ).length
  const pendingEmployers = (partners || []).filter((row) => row.status === "pending").length
  const atRisk = snapshot.engagement.atRiskDepartments.length
  const jobPosts = snapshot.market.dailyJobPosts.reduce((sum, row) => sum + row.value, 0)
  const slice = snapshot.outcomes.slices.find((row) => row.checkpoint === "graduation") || snapshot.outcomes.slices[0]
  const placed = slice ? slice.employed + slice.gradSchool : null
  const appsDelta = pctChange(snapshot.engagement.dailyApplications.map((row) => row.value))
  const jobsDelta = pctChange(snapshot.market.dailyJobPosts.map((row) => row.value))
  const prevCohort = snapshot.outcomes.cohorts.length >= 2 ? snapshot.outcomes.cohorts[snapshot.outcomes.cohorts.length - 2] : null
  const currCohort = snapshot.outcomes.cohorts.length ? snapshot.outcomes.cohorts[snapshot.outcomes.cohorts.length - 1] : null
  const prevRate = prevCohort && prevCohort.n ? prevCohort.placed / prevCohort.n : null
  const currRate = currCohort && currCohort.n ? currCohort.placed / currCohort.n : null
  const placeDelta =
    prevRate != null && prevRate > 0 && currRate != null ? Math.round(((currRate - prevRate) / prevRate) * 100) : null
  const now = Date.now()
  const event =
    [...snapshot.operations.events]
      .sort((a, b) => {
        const at = a.starts_at ? new Date(a.starts_at).getTime() : Number.POSITIVE_INFINITY
        const bt = b.starts_at ? new Date(b.starts_at).getTime() : Number.POSITIVE_INFINITY
        return at - bt
      })
      .find((row) => !row.starts_at || new Date(row.starts_at).getTime() >= now - 6 * 60 * 60 * 1000) ||
    snapshot.operations.events[0]
  const international = snapshot.market.internationalPrograms
  const windowLabel =
    snapshot.period.id === "custom"
      ? snapshot.period.label
      : snapshot.period.days
        ? `the last ${snapshot.period.days} days`
        : "all time"
  const nps =
    snapshot.market.employerNps.value != null
      ? { row: snapshot.market.employerNps, label: "Employer NPS" }
      : snapshot.operations.npsOffice.value != null
        ? { row: snapshot.operations.npsOffice, label: "Career office NPS" }
        : { row: snapshot.operations.npsPlatform, label: "Platform NPS" }
  const href = (path: string) => campusQueryHref(path, snapshot)

  const pending = [
    {
      href: "/campus/jobs",
      title: "Daily job posts",
      count: jobPosts,
      hint: `${fmtNum(snapshot.market.openJobs)} open roles now`,
      icon: Briefcase,
    },
    {
      href: "/campus/applications",
      title: "Student applications",
      count: snapshot.engagement.applicationsWeek,
      hint: `${fmtNum(snapshot.engagement.applicants)} unique applicants`,
      icon: Users,
    },
    {
      href: "/campus/employers",
      title: "Employer verifications",
      count: pendingEmployers,
      hint: "Partners waiting on CDC review",
      icon: Building2,
    },
    {
      href: "/campus/departments",
      title: "Low activity departments",
      count: atRisk,
      hint: "Programmes below campus activity",
      icon: TriangleAlert,
    },
    {
      href: "/campus/approvals",
      title: "Job approvals",
      count: pendingJobs,
      hint: "Held or pending review",
      icon: ClipboardCheck,
    },
    {
      href: "/campus/events",
      title: "Event registrations",
      count: snapshot.engagement.rsvps,
      hint: `${fmtNum(snapshot.operations.events.length)} campus events`,
      icon: Calendar,
    },
    {
      href: "/campus/opportunities",
      title: "International programs",
      count: international,
      hint: "Active listings on this campus",
      icon: Globe,
    },
  ]

  const actions = [
    { href: "/campus/approvals", label: "Approve jobs", show: canAct },
    { href: "/campus/events", label: "Manage events", show: canCampus(snapshot.access, "view_events") },
    { href: "/campus/reports", label: "View reports", show: canCampus(snapshot.access, "view_reports") },
    { href: "/campus/announcements", label: "Add announcement", show: canAct },
  ].filter((item) => item.show)

  const insights = [
    {
      icon: TrendingUp,
      value: fmtNum(snapshot.engagement.applicationsMonth),
      copy:
        appsDelta == null
          ? `${fmtNum(snapshot.engagement.applicants)} applicants in ${windowLabel}`
          : `${appsDelta > 0 ? "+" : ""}${appsDelta}% vs the first half of this window · ${fmtNum(snapshot.engagement.applicants)} applicants`,
    },
    {
      icon: Handshake,
      value: nps.row.value == null ? "—" : fmtNum(Math.round(nps.row.value)),
      copy: nps.row.n ? `${nps.label} from ${nps.row.n} live survey responses` : `${nps.label} · no responses yet`,
    },
    {
      icon: Globe,
      value: fmtNum(international),
      copy: "Live international programs on this campus",
    },
  ]

  return (
    <CampusFrame
      snapshot={snapshot}
      showSources={false}
      showRange={false}
      hideEyebrow
      title="Career Center Dashboard"
      description="Live job posts, applications, employers, and placements for this campus."
      actions={
        <Suspense fallback={null}>
          <CampusHomeToolbar
            current={snapshot.period.id}
            from={snapshot.period.from}
            to={snapshot.period.to}
            campus={uni}
            canExport={canExport}
          />
        </Suspense>
      }
    >
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <CampusHomeKpi
          href={href("/campus/market")}
          icon={Briefcase}
          label="Total job posts"
          value={fmtNum(jobPosts)}
          delta={jobsDelta}
          detail={`${fmtNum(snapshot.market.openJobs)} open · ${fmtNum(snapshot.market.internships)} internships`}
          tone="navy"
        />
        <CampusHomeKpi
          href={href("/campus/market")}
          icon={Users}
          label="Active employers"
          value={fmtNum(snapshot.market.activeEmployers ?? snapshot.kpis.employersEngaged.value)}
          detail={`${fmtNum(snapshot.market.newEmployers)} new this window · ${fmtNum(snapshot.market.repeatEmployers)} repeat`}
          tone="white"
        />
        <CampusHomeKpi
          href={href("/campus/applications")}
          icon={UserRound}
          label="Student applications"
          value={fmtNum(snapshot.engagement.applicationsMonth)}
          delta={appsDelta}
          detail={`${fmtNum(snapshot.engagement.applicants)} of ${fmtNum(snapshot.engagement.registered)} students · ${snapshot.engagement.appsPerStudent} apps each`}
          tone="blue"
        />
        <CampusHomeKpi
          href={href("/campus/outcomes")}
          icon={Handshake}
          label="Placements"
          value={placed != null ? fmtNum(placed) : fmtSourced(snapshot.kpis.placementRate, "pct")}
          delta={placeDelta}
          detail={
            placed != null
              ? `${fmtSourced(snapshot.kpis.placementRate, "pct")} placement rate · ${fmtNum(slice?.n)} records`
              : snapshot.kpis.placementRate.note || "Employed + graduate school"
          }
          tone="wash"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)_minmax(15rem,0.75fr)]">
        <Card className={PANEL}>
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-heading text-lg font-semibold text-[#051C2C]">Pending items</h2>
              <Link href={href("/campus/pending")} className="text-sm font-medium text-[#2251FF] hover:text-[#3A66FF] hover:underline">
                View all
              </Link>
            </div>
            <ul className="space-y-1">
              {pending.map((row) => (
                <li key={row.title}>
                  <Link
                    href={href(row.href)}
                    className="flex min-h-12 items-center gap-3 rounded-2xl px-2 py-1.5 text-sm text-[#051C2C] hover:bg-[rgba(34,81,255,0.06)]"
                  >
                    <span className={cn("grid size-9 shrink-0 place-items-center rounded-full", ICON)}>
                      <row.icon className="h-3.5 w-3.5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{row.title}</span>
                      <span className="block truncate text-[12px] text-[rgba(5,28,44,0.5)]">{row.hint}</span>
                    </span>
                    <span className="campus-chip rounded-full bg-white px-2.5 py-1 text-[13px] font-semibold tabular-nums">
                      {row.count}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <CampusTrendChart
          title="Placement trends"
          description="Live job posts and student applications in this window."
          jobsKey="Job posts"
          appsKey="Applications"
          periodLabel={snapshot.period.label}
          points={snapshot.market.dailyJobPosts.map((row, i) => ({
            label: row.label,
            jobs: row.value,
            applications: snapshot.engagement.dailyApplications[i]?.value ?? 0,
          }))}
        />

        <Card className={cn(PANEL, "md:col-span-2 xl:col-span-1")}>
          <CardContent className="p-5">
            <h2 className="mb-3 font-heading text-lg font-semibold text-[#051C2C]">Quick actions</h2>
            <ul className="space-y-1">
              {actions.map((item) => (
                <li key={item.href}>
                  <Link
                    href={href(item.href)}
                    className="flex min-h-11 items-center gap-3 rounded-2xl px-2 text-sm font-medium text-[#051C2C] hover:bg-[rgba(34,81,255,0.06)]"
                  >
                    <span className={cn("grid size-7 place-items-center rounded-full", ICON)}>
                      <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                    </span>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.9fr)]">
        <Card className={PANEL}>
          <CardContent className="p-5">
            <h2 className="mb-4 font-heading text-lg font-semibold text-[#051C2C]">Key insights</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {insights.map((item) => (
                <div key={item.copy} className="campus-chip rounded-[1.5rem] bg-white p-4">
                  <span className={cn("grid size-10 place-items-center rounded-full", ICON)}>
                    <item.icon className="h-4 w-4" aria-hidden />
                  </span>
                  <p className="mt-3 text-xl font-semibold tabular-nums text-[#051C2C]">{item.value}</p>
                  <p className="mt-1 text-[13px] leading-snug text-[rgba(5,28,44,0.58)]">{item.copy}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <article className="relative min-h-[13.5rem] overflow-hidden rounded-[2rem] bg-[linear-gradient(165deg,#0b3a54_0%,#051C2C_58%,#03141e_100%)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2),inset_0_-16px_28px_rgba(0,0,0,0.28),0_12px_20px_-10px_rgba(5,28,44,0.45),0_32px_56px_-18px_rgba(5,28,44,0.55)]">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/15 to-transparent" />
          <div className="absolute -right-8 -top-10 size-40 rounded-full bg-[#2251FF]/40 blur-3xl" />
          <div className="absolute inset-x-6 top-0 h-1 rounded-b-full bg-[#2251FF]" />
          <div className="relative flex h-full min-h-[13.5rem] flex-col justify-end p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55">
              {event?.kind ? event.kind.replace(/_/g, " ") : "Upcoming event"}
            </p>
            <p className="mt-2 font-heading text-xl font-semibold">{event?.title || "Career fair"}</p>
            <p className="mt-1 text-sm text-white/70">
              {event
                ? [eventWhen(event.starts_at), event.location, `${event.rsvps} RSVPs`, event.hires ? `${event.hires} hires` : null]
                    .filter(Boolean)
                    .join(" · ")
                : "No campus career fair is on the calendar yet."}
            </p>
            <Button asChild className="mt-4 h-10 w-fit rounded-full bg-[#2251FF] text-white shadow-[0_10px_20px_-8px_rgba(34,81,255,0.8)] hover:bg-[#3A66FF]">
              <Link href={href("/campus/events")}>View details</Link>
            </Button>
          </div>
        </article>
      </div>
    </CampusFrame>
  )
}
