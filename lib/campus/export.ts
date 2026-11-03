import type { CampusSnapshot } from "@/lib/campus/types"
import type { Sheet } from "@/lib/export/formats"

export const CAMPUS_EXPORT_DATASETS = [
  "overview",
  "jobs",
  "applications",
  "engagement",
  "departments",
  "outcomes",
] as const

export type CampusExportDataset = (typeof CAMPUS_EXPORT_DATASETS)[number]

export function isCampusExportDataset(value: unknown): value is CampusExportDataset {
  return typeof value === "string" && (CAMPUS_EXPORT_DATASETS as readonly string[]).includes(value)
}

function sheet(name: string, rows: Record<string, unknown>[]): Sheet {
  const columns = rows[0] ? Object.keys(rows[0]) : ["value"]
  return { name, columns, rows }
}

export function buildCampusExport(snapshot: CampusSnapshot, dataset: CampusExportDataset) {
  const campus = snapshot.access.university || "campus"
  const stamp = new Date().toISOString().slice(0, 10)
  const kpis = snapshot.kpis
  const engagement = snapshot.engagement
  const market = snapshot.market

  const sheets: Sheet[] =
    dataset === "jobs"
      ? [
          sheet(
            "Daily job posts",
            market.dailyJobPosts.map((row) => ({ date: row.date, posts: row.value }))
          ),
          sheet("Jobs by category", market.byMajor.map((row) => ({ category: row.label, jobs: row.value }))),
          sheet("Jobs by location", market.byLocation.map((row) => ({ location: row.label, jobs: row.value }))),
        ]
      : dataset === "applications"
        ? [
            sheet(
              "Daily applications",
              engagement.dailyApplications.map((row) => ({ date: row.date, applications: row.value }))
            ),
            sheet("By programme", engagement.applicationsByMajor.map((row) => ({ programme: row.label, applications: row.value }))),
            sheet("By employer", engagement.applicationsByEmployer.map((row) => ({ employer: row.label, applications: row.value }))),
          ]
        : dataset === "engagement"
          ? [
              sheet("Funnel", engagement.funnel.map((row) => ({ stage: row.label, students: row.value }))),
              sheet("By programme", engagement.byMajor.map((row) => ({ programme: row.label, students: row.value }))),
              sheet("Active by programme", engagement.activeByMajor.map((row) => ({ programme: row.label, students: row.value }))),
            ]
          : dataset === "departments"
            ? [
                sheet(
                  "At-risk departments",
                  engagement.atRiskDepartments.map((row) => ({
                    department: row.department,
                    students: row.students,
                    active_month: row.activeMonth,
                    applications: row.applications,
                    activity_rate: row.activityRate,
                    application_rate: row.appRate,
                    reason: row.reason,
                  }))
                ),
              ]
            : dataset === "outcomes"
              ? [
                  sheet(
                    "Checkpoints",
                    snapshot.outcomes.slices.map((row) => ({
                      checkpoint: row.checkpoint,
                      employed: row.employed,
                      grad_school: row.gradSchool,
                      still_seeking: row.stillSeeking,
                      not_seeking: row.notSeeking,
                      n: row.n,
                    }))
                  ),
                ]
              : [
                  sheet("KPIs", [
                    { metric: "Placement rate", value: kpis.placementRate.value, n: kpis.placementRate.n },
                    { metric: "Active students this month", value: kpis.activeStudentsMonth.value, n: kpis.activeStudentsMonth.n },
                    { metric: "Open jobs matched", value: kpis.openJobsMatched.value, n: kpis.openJobsMatched.n },
                    { metric: "Employers engaged", value: kpis.employersEngaged.value, n: kpis.employersEngaged.n },
                    { metric: "Students needing attention", value: kpis.needingAttention.value, n: kpis.needingAttention.n },
                    { metric: "Applications this week", value: engagement.applicationsWeek, n: engagement.applicants },
                    { metric: "Job posts today", value: market.dailyJobPosts.at(-1)?.value ?? 0, n: market.openJobs },
                  ]),
                  sheet(
                    "Daily posts vs applications",
                    market.dailyJobPosts.map((row, i) => ({
                      date: row.date,
                      job_posts: row.value,
                      applications: engagement.dailyApplications[i]?.value ?? 0,
                    }))
                  ),
                  sheet(
                    "Alerts",
                    snapshot.alerts.map((row) => ({ title: row.title, detail: row.detail, count: row.count, severity: row.severity }))
                  ),
                ]

  return {
    filename: `${dataset}_${campus.replace(/[^\w]+/g, "-").slice(0, 40)}_${stamp}`,
    title: dataset === "jobs" ? "Daily job posts" : dataset[0].toUpperCase() + dataset.slice(1),
    sheets: sheets.filter((item) => item.rows.length > 0 || item.columns.length > 0),
  }
}
