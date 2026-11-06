import type { CampusExportDataset } from "@/lib/campus/export"
import type { CampusSnapshot } from "@/lib/campus/types"
import { fmtNum, fmtSourced } from "@/lib/campus/format"
import { campusRangeQuery, withCampusFilters } from "@/lib/campus/range"

export function campusQueryHref(path: string, snapshot: Pick<CampusSnapshot, "access" | "period">) {
  return withCampusFilters(path, {
    campus: snapshot.access.university,
    ...campusRangeQuery(snapshot.period),
  })
}

export type CampusReportId = "jobs" | "engagement" | "employers" | "applications" | "placement" | "departments"

export type CampusReportCard = {
  id: CampusReportId
  href: string
  title: string
  description: string
  dataset: CampusExportDataset
  value: string
  hint: string
}

export function campusReportCards(snapshot: CampusSnapshot): CampusReportCard[] {
  const { engagement, market, kpis, period } = snapshot
  const jobPosts = market.dailyJobPosts.reduce((sum, row) => sum + row.value, 0)
  return [
    {
      id: "jobs",
      href: "/campus/market",
      title: "Job posts",
      description: "New listings posted to the board in this window.",
      dataset: "jobs",
      value: fmtNum(jobPosts),
      hint: `${market.openJobs} open roles · ${market.internships} internships`,
    },
    {
      id: "engagement",
      href: "/campus/engagement",
      title: "Engagement rates",
      description: "Share of registered students who were active in this window.",
      dataset: "engagement",
      value: fmtSourced(kpis.engagementRate, "pct"),
      hint: `${engagement.activeMonth} active · ${engagement.inactive} quiet · ${period.shortLabel.toLowerCase()}`,
    },
    {
      id: "employers",
      href: "/campus/market",
      title: "Employer activity",
      description: "Employers who posted or received applications in this window.",
      dataset: "employers",
      value: fmtSourced(kpis.employersEngaged),
      hint: `${market.newEmployers} new employers · ${market.repeatEmployers} repeat hirers`,
    },
    {
      id: "applications",
      href: "/campus/applications",
      title: "Student applications",
      description: "Right-swipes counted as applications in this window.",
      dataset: "applications",
      value: fmtNum(engagement.applicationsMonth),
      hint: `${engagement.applicants} applicants · ${engagement.appsPerStudent} apps per student`,
    },
    {
      id: "placement",
      href: "/campus/outcomes",
      title: "Placement insights & trends",
      description: "Employed plus continuing education for the current class.",
      dataset: "outcomes",
      value: fmtSourced(kpis.placementRate, "pct"),
      hint: kpis.placementRate.note || "Employed + graduate school",
    },
    {
      id: "departments",
      href: "/campus/departments",
      title: "At-risk departments",
      description: "Programmes with no applications or low activity in this window.",
      dataset: "departments",
      value: fmtNum(engagement.atRiskDepartments.length),
      hint: engagement.atRiskDepartments[0]
        ? `${engagement.atRiskDepartments[0].department} · ${engagement.atRiskDepartments[0].reason}`
        : "No programme is flagged right now",
    },
  ]
}
