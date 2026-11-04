import { sourceLabel, fmtPct, fmtNum } from "@/lib/campus/format"
import type { CampusSnapshot, CountRow, SourcedNumber } from "@/lib/campus/types"
import type { PdfHero, Sheet } from "@/lib/export/formats"

export const CAMPUS_EXPORT_DATASETS = [
  "overview",
  "placement",
  "active_students",
  "open_jobs",
  "applications",
  "employers",
  "attention",
  "equity",
  "jobs",
  "engagement",
  "departments",
  "outcomes",
] as const

export type CampusExportDataset = (typeof CAMPUS_EXPORT_DATASETS)[number]

export function isCampusExportDataset(value: unknown): value is CampusExportDataset {
  return typeof value === "string" && (CAMPUS_EXPORT_DATASETS as readonly string[]).includes(value)
}

const TITLES: Record<CampusExportDataset, string> = {
  overview: "CDC dashboard overview",
  placement: "Placement rate (current class)",
  active_students: "Active students this month",
  open_jobs: "Open jobs matched to students",
  applications: "Student applications",
  employers: "Employers engaged",
  attention: "Students needing attention",
  equity: "Equity gap flag",
  jobs: "Daily job posts",
  engagement: "Student engagement",
  departments: "At-risk departments",
  outcomes: "First-destination outcomes",
}

function sheet(name: string, rows: Record<string, unknown>[]): Sheet {
  const columns = rows[0] ? Object.keys(rows[0]) : ["value"]
  return { name, columns, rows }
}

function counts(name: string, rows: CountRow[], label = "label", value = "count") {
  return sheet(
    name,
    rows.map((row) => ({ [label]: row.label, [value]: row.value }))
  )
}

function sourced(metric: string, row: SourcedNumber, extra?: string) {
  return {
    metric,
    value: row.value ?? "—",
    sample_n: row.n,
    source: sourceLabel(row.source),
    note: extra || row.note || "",
  }
}

function pct(row: SourcedNumber) {
  return row.value == null ? "—" : fmtPct(row.value)
}

export type CampusExportResult = {
  filename: string
  title: string
  subtitle: string
  org: string
  hero?: PdfHero
  notes: string[]
  sheets: Sheet[]
}

export function buildCampusExport(snapshot: CampusSnapshot, dataset: CampusExportDataset): CampusExportResult {
  const campus = snapshot.access.university || "All campuses"
  const stamp = new Date().toISOString().slice(0, 10)
  const kpis = snapshot.kpis
  const engagement = snapshot.engagement
  const market = snapshot.market
  const outcomes = snapshot.outcomes
  const equity = snapshot.equity
  const title = TITLES[dataset]
  const org = "IoBM Career Development Center"
  const rangeLabel = snapshot.period?.label || "1 month"
  const subtitle = `${campus} · ${rangeLabel} · ${stamp}`
  const filename = `${dataset}_${snapshot.period?.id || "month"}_${campus.replace(/[^\w]+/g, "-").slice(0, 40)}_${stamp}`

  const keep = (items: Sheet[]) => items.filter((item) => item.rows.length > 0)

  if (dataset === "placement") {
    const slice = outcomes.slices.find((s) => s.checkpoint === "graduation") || outcomes.slices[0]
    return {
      filename,
      title,
      subtitle,
      org,
      hero: {
        label: title,
        value: pct(kpis.placementRate),
        hint: `${kpis.placementRate.note || "Employed + continuing education"} · n=${kpis.placementRate.n} · ${sourceLabel(kpis.placementRate.source)}`,
      },
      notes: [
        "Placement rate is employed plus graduate school at the graduation checkpoint, divided by the current class with a known outcome.",
        "Survey rows are self-reported. Platform hires are verified matches with status hired.",
        "Use Excel if you need the full first-destination table for HEC or NBEAC.",
      ],
      sheets: keep([
        sheet("Summary", [
          { metric: "Placement rate", value: pct(kpis.placementRate), sample_n: kpis.placementRate.n, source: sourceLabel(kpis.placementRate.source), note: kpis.placementRate.note || "Employed + graduate school" },
          sourced("Time to first offer (days)", outcomes.timeToFirstOfferDays),
          { metric: "Underemployed share", value: pct(outcomes.underemployed), sample_n: outcomes.underemployed.n, source: sourceLabel(outcomes.underemployed.source), note: outcomes.underemployed.note || "" },
        ]),
        sheet(
          "Outcome checkpoints",
          outcomes.slices.map((row) => ({
            checkpoint: row.checkpoint,
            employed: row.employed,
            graduate_school: row.gradSchool,
            still_seeking: row.stillSeeking,
            not_seeking: row.notSeeking,
            unknown: row.unknown,
            n: row.n,
            source: sourceLabel(row.source),
          }))
        ),
        sheet(
          "Cohorts",
          outcomes.cohorts.map((row) => ({ year: row.year, placed: row.placed, n: row.n }))
        ),
        counts("Industries", outcomes.industries, "industry", "graduates"),
        counts("Roles", outcomes.roles, "role", "graduates"),
        counts("Locations", outcomes.geos, "location", "graduates"),
        sheet(
          "Salary by programme",
          outcomes.salariesByMajor.map((row) => ({
            programme: row.group,
            average: row.average ?? "—",
            median: row.median ?? "—",
            n: row.n,
          }))
        ),
        slice
          ? sheet("Current class snapshot", [
              { status: "Employed", count: slice.employed },
              { status: "Graduate school", count: slice.gradSchool },
              { status: "Still seeking", count: slice.stillSeeking },
              { status: "Not seeking", count: slice.notSeeking },
              { status: "Unknown", count: slice.unknown },
              { status: "Class size (n)", count: slice.n },
            ])
          : sheet("Current class snapshot", []),
      ]),
    }
  }

  if (dataset === "active_students") {
    return {
      filename,
      title,
      subtitle,
      org,
      hero: {
        label: title,
        value: fmtNum(kpis.activeStudentsMonth.value),
        hint: `${engagement.registered} registered · ${engagement.inactive} inactive · ${sourceLabel(kpis.activeStudentsMonth.source)}`,
      },
      notes: [
        "Active means at least one swipe, application, or profile update in the last 30 days.",
        "Registered is every student profile attached to this campus.",
      ],
      sheets: keep([
        sheet("Summary", [
          sourced("Active this month", kpis.activeStudentsMonth),
          { metric: "Registered", value: engagement.registered, sample_n: engagement.registered, source: "Platform", note: "" },
          { metric: "Active this week", value: engagement.activeWeek, sample_n: engagement.registered, source: "Platform", note: "" },
          { metric: "Inactive", value: engagement.inactive, sample_n: engagement.registered, source: "Platform", note: "" },
          sourced("Profiles complete", engagement.profileComplete),
          sourced("Resume uploaded", engagement.resumeUploaded),
          sourced("Skills filled", engagement.skillsFilled),
        ]),
        counts("By graduation year", engagement.byYear, "year", "students"),
        counts("By programme", engagement.byMajor, "programme", "students"),
        counts("Active by programme", engagement.activeByMajor, "programme", "students"),
        sheet("Funnel", engagement.funnel.map((row) => ({ stage: row.label, students: row.value }))),
      ]),
    }
  }

  if (dataset === "open_jobs" || dataset === "jobs") {
    return {
      filename,
      title: dataset === "jobs" ? TITLES.jobs : title,
      subtitle,
      org,
      hero: {
        label: TITLES.open_jobs,
        value: fmtNum(kpis.openJobsMatched.value),
        hint: `${market.dailyJobPosts.at(-1)?.value ?? 0} posted today · ${market.internships} internships · ${sourceLabel(kpis.openJobsMatched.source)}`,
      },
      notes: [
        "Open jobs are active listings visible to this campus after any CDC review rule.",
        "Matched means the listing is in the student Discover pool, not that a student has applied.",
      ],
      sheets: keep([
        sheet("Summary", [
          sourced("Open jobs matched", kpis.openJobsMatched),
          { metric: "Internships", value: market.internships, sample_n: market.openJobs, source: "Platform", note: "" },
          { metric: "Posted today", value: market.dailyJobPosts.at(-1)?.value ?? 0, sample_n: market.openJobs, source: "Platform", note: "" },
          { metric: "Active employers", value: market.activeEmployers, sample_n: market.activeEmployers, source: "Platform", note: "" },
        ]),
        sheet(
          "Daily job posts",
          market.dailyJobPosts.map((row) => ({ date: row.date, label: row.label, posts: row.value }))
        ),
        counts("By category", market.byMajor, "category", "jobs"),
        counts("By location", market.byLocation, "location", "jobs"),
        counts("By work mode", market.byWorkMode, "mode", "jobs"),
        sheet(
          "Supply gaps",
          market.supplyGaps.map((row) => ({
            programme: row.major,
            students: row.students,
            jobs: row.jobs,
            gap: row.gap,
          }))
        ),
      ]),
    }
  }

  if (dataset === "applications") {
    return {
      filename,
      title,
      subtitle,
      org,
      hero: {
        label: title,
        value: fmtNum(engagement.applicationsWeek),
        hint: `${engagement.applicationsMonth} this month · ${engagement.applicants} unique applicants`,
      },
      notes: [
        "An application is a right-swipe (or apply) on a live job.",
        "Unique applicants count distinct students, not rows.",
      ],
      sheets: keep([
        sheet("Summary", [
          { metric: "Applications this week", value: engagement.applicationsWeek, sample_n: engagement.applicants, source: "Platform", note: "" },
          { metric: "Applications this month", value: engagement.applicationsMonth, sample_n: engagement.applicants, source: "Platform", note: "" },
          { metric: "Unique applicants", value: engagement.applicants, sample_n: engagement.registered, source: "Platform", note: "" },
          { metric: "Applications per student", value: engagement.appsPerStudent, sample_n: engagement.registered, source: "Platform", note: "" },
        ]),
        sheet(
          "Daily applications",
          engagement.dailyApplications.map((row) => ({ date: row.date, label: row.label, applications: row.value }))
        ),
        counts("By programme", engagement.applicationsByMajor, "programme", "applications"),
        counts("By employer", engagement.applicationsByEmployer, "employer", "applications"),
        sheet(
          "At-risk programmes",
          engagement.atRiskDepartments.map((row) => ({
            department: row.department,
            students: row.students,
            applications: row.applications,
            reason: row.reason,
          }))
        ),
      ]),
    }
  }

  if (dataset === "employers") {
    return {
      filename,
      title,
      subtitle,
      org,
      hero: {
        label: title,
        value: fmtNum(kpis.employersEngaged.value),
        hint: `${market.newEmployers} new this month · ${sourceLabel(kpis.employersEngaged.source)}`,
      },
      notes: [
        "Engaged employers have an approved profile and at least one campus-visible job or partnership.",
        "Response time is from application to first recruiter message when that exists.",
      ],
      sheets: keep([
        sheet("Summary", [
          sourced("Employers engaged", kpis.employersEngaged),
          { metric: "New this month", value: market.newEmployers, sample_n: market.activeEmployers, source: "Platform", note: "" },
          { metric: "Repeat employers", value: market.repeatEmployers, sample_n: market.activeEmployers, source: "Platform", note: "" },
          sourced("Response rate", market.responseRate),
          sourced("Time to respond (hours)", market.timeToRespondHours),
          sourced("Employer NPS", market.employerNps),
        ]),
        sheet(
          "Top employers",
          market.topEmployers.map((row) => ({ employer: row.name, applications: row.apps, hires: row.hires }))
        ),
        sheet(
          "Partners",
          market.partners.map((row) => ({ employer: row.name, tier: row.tier }))
        ),
      ]),
    }
  }

  if (dataset === "attention" || dataset === "departments") {
    return {
      filename,
      title: dataset === "departments" ? TITLES.departments : title,
      subtitle,
      org,
      hero: {
        label: TITLES.attention,
        value: fmtNum(kpis.needingAttention.value),
        hint: "Seniors with no applications, quiet for 14+ days, or zero activity since joining",
      },
      notes: [
        "This list is an outreach queue, not a disciplinary record.",
        "Nudge from Actions. Names are visible only to campus staff.",
      ],
      sheets: keep([
        sheet("Summary", [
          sourced("Students needing attention", kpis.needingAttention),
          { metric: "Zero activity", value: engagement.zeroActivity.length, sample_n: engagement.registered, source: "Platform", note: "" },
          { metric: "At-risk programmes", value: engagement.atRiskDepartments.length, sample_n: engagement.byMajor.length, source: "Platform", note: "" },
        ]),
        sheet(
          "Students",
          snapshot.attention.map((row) => ({
            name: row.name,
            programme: row.major || "",
            class_year: row.year ?? "",
            reason: row.reason,
          }))
        ),
        sheet(
          "Zero activity",
          engagement.zeroActivity.map((row) => ({
            name: row.name,
            programme: row.major || "",
            class_year: row.year ?? "",
            reason: row.reason,
          }))
        ),
        sheet(
          "At-risk departments",
          engagement.atRiskDepartments.map((row) => ({
            department: row.department,
            students: row.students,
            active_month: row.activeMonth,
            applications: row.applications,
            activity_rate: row.activityRate ?? "—",
            application_rate: row.appRate ?? "—",
            reason: row.reason,
          }))
        ),
      ]),
    }
  }

  if (dataset === "equity") {
    return {
      filename,
      title,
      subtitle,
      org,
      hero: {
        label: title,
        value: kpis.equityGapFlag.flagged ? "On" : "Clear",
        hint: kpis.equityGapFlag.detail,
      },
      notes: [
        "FERPA-gated. Only consented demographic records are shown.",
        "Views of equity data are written to the campus audit log.",
        equity.available
          ? `${equity.consented} students have a consented demographic file.`
          : "No consented demographic file is attached yet. The flag stays Clear until cell sizes are safe to publish.",
      ],
      sheets: keep([
        sheet("Summary", [
          { metric: "Gap flag", value: kpis.equityGapFlag.flagged ? "On" : "Clear", sample_n: equity.consented, source: sourceLabel(kpis.equityGapFlag.source), note: kpis.equityGapFlag.detail },
          { metric: "Consented records", value: equity.consented, sample_n: equity.consented, source: "Self-reported", note: "" },
          sourced("First-gen placement", equity.firstGenPlacement),
          { metric: "International (consented)", value: equity.international.n, sample_n: equity.consented, source: "Self-reported", note: `${equity.international.cptOpt} CPT/OPT` },
          { metric: "Veterans", value: equity.veteran, sample_n: equity.consented, source: "Self-reported", note: "" },
          { metric: "Transfer students", value: equity.transfer, sample_n: equity.consented, source: "Self-reported", note: "" },
        ]),
        counts("Gender", equity.byGender, "gender", "students"),
        counts("Race / ethnicity", equity.byRace, "group", "students"),
        counts("Disability disclosure", equity.byDisability, "status", "students"),
        counts("Pell / low-income", equity.byIncome, "status", "students"),
        sheet(
          "Gap flags",
          equity.gaps.map((row) => ({ label: row.label, delta: row.delta }))
        ),
      ]),
    }
  }

  if (dataset === "engagement") {
    return {
      filename,
      title,
      subtitle,
      org,
      hero: {
        label: title,
        value: fmtNum(engagement.activeMonth),
        hint: `${engagement.registered} registered · ${engagement.applicationsMonth} applications this month`,
      },
      notes: ["Engagement combines logins, swipes, applications, RSVPs, and advising."],
      sheets: keep([
        sheet("Funnel", engagement.funnel.map((row) => ({ stage: row.label, students: row.value }))),
        counts("By programme", engagement.byMajor, "programme", "students"),
        counts("Active by programme", engagement.activeByMajor, "programme", "students"),
      ]),
    }
  }

  if (dataset === "outcomes") {
    return {
      filename,
      title,
      subtitle,
      org,
      hero: {
        label: TITLES.placement,
        value: pct(kpis.placementRate),
        hint: sourceLabel(kpis.placementRate.source),
      },
      notes: ["First-destination checkpoints: graduation, 3 / 6 / 12 months."],
      sheets: keep([
        sheet(
          "Checkpoints",
          outcomes.slices.map((row) => ({
            checkpoint: row.checkpoint,
            employed: row.employed,
            grad_school: row.gradSchool,
            still_seeking: row.stillSeeking,
            not_seeking: row.notSeeking,
            unknown: row.unknown,
            n: row.n,
          }))
        ),
      ]),
    }
  }

  return {
    filename,
    title,
    subtitle,
    org,
    hero: {
      label: "CDC dashboard",
      value: pct(kpis.placementRate),
      hint: `Placement rate · ${engagement.registered} students · ${fmtNum(kpis.openJobsMatched.value)} open jobs`,
    },
    notes: [
      "Headline numbers mix live platform activity with survey records when those exist.",
      "Each KPI card has its own CSV, Excel, and PDF export with the supporting tables.",
    ],
    sheets: keep([
      sheet("KPIs", [
        { metric: "Placement rate", value: pct(kpis.placementRate), sample_n: kpis.placementRate.n, source: sourceLabel(kpis.placementRate.source), note: kpis.placementRate.note || "" },
        sourced("Active students", kpis.activeStudentsMonth),
        { metric: "Engagement rate", value: pct(kpis.engagementRate), sample_n: kpis.engagementRate.n, source: sourceLabel(kpis.engagementRate.source), note: kpis.engagementRate.note || "" },
        sourced("Open jobs matched", kpis.openJobsMatched),
        {
          metric: "Student applications",
          value: engagement.applicationsMonth,
          sample_n: engagement.applicants,
          source: "Platform",
          note: snapshot.period?.label || "Selected range",
        },
        sourced("Employers engaged", kpis.employersEngaged),
        sourced("Students needing attention", kpis.needingAttention),
        {
          metric: "Equity gap flag",
          value: kpis.equityGapFlag.flagged ? "On" : "Clear",
          sample_n: equity.consented,
          source: sourceLabel(kpis.equityGapFlag.source),
          note: kpis.equityGapFlag.detail,
        },
        { metric: "Job posts today", value: market.dailyJobPosts.at(-1)?.value ?? 0, sample_n: market.openJobs, source: "Platform", note: `${market.internships} internships` },
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
      sheet(
        "At-risk departments",
        engagement.atRiskDepartments.map((row) => ({
          department: row.department,
          students: row.students,
          applications: row.applications,
          reason: row.reason,
        }))
      ),
      sheet("Funnel", engagement.funnel.map((row) => ({ stage: row.label, students: row.value }))),
      sheet(
        "Top employers",
        market.topEmployers.map((row) => ({ employer: row.name, applications: row.apps, hires: row.hires }))
      ),
      sheet(
        "Students needing attention",
        snapshot.attention.map((row) => ({
          name: row.name,
          programme: row.major || "",
          class_year: row.year ?? "",
          reason: row.reason,
        }))
      ),
    ]),
  }
}
