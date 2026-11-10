import Link from "next/link"
import { Users } from "lucide-react"
import { loadCampusPage } from "@/lib/campus/page-data"
import { canCampus } from "@/lib/campus/rbac"
import { campusQueryHref } from "@/lib/campus/reports"
import {
  CAMPUS_DIRECTORY_PAGE_SIZE,
  loadCampusStudentDirectory,
  parseCampusDirectoryFilters,
  summarizeDirectoryFilters,
} from "@/lib/campus/directory"
import { PeopleDirectoryTabs } from "@/components/campus/PeopleDirectoryTabs"
import { StudentDirectory } from "@/components/campus/StudentDirectory"
import { StudentDirectoryFilters } from "@/components/campus/StudentDirectoryFilters"
import { CampusFrame } from "@/components/campus/CampusFrame"
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState"
import { DashboardPanel } from "@/components/dashboard/DashboardPanel"
import { Button } from "@/components/ui/button"

const FILTER_PARAM_KEYS = [
  "q",
  "college",
  "program",
  "class",
  "completion",
  "completion_op",
  "completion_n",
  "inactive",
  "inactive_n",
  "employed",
  "suspended",
] as const

export default async function CampusPeoplePage({
  searchParams,
}: {
  searchParams: Promise<{
    campus?: string
    kind?: string
    q?: string
    page?: string
    range?: string
    from?: string
    to?: string
    college?: string
    program?: string
    class?: string
    completion?: string
    completion_op?: string
    completion_n?: string
    inactive?: string
    inactive_n?: string
    employed?: string
    suspended?: string
  }>
}) {
  const { snapshot, params } = await loadCampusPage(searchParams, "view_actions")
  const kind = params.kind === "alumni" ? "alumni" : "students"
  const filters = parseCampusDirectoryFilters(params)
  const page = Math.max(1, Number.parseInt(String(params.page || "1"), 10) || 1)
  const university = snapshot.access.university
  const canMutate = canCampus(snapshot.access, "mutate")

  if (!university && snapshot.access.role !== "admin") {
    return (
      <CampusFrame
        snapshot={snapshot}
        showRange={false}
        title="Partners & stakeholders"
        description="Students, alumni, and employers linked to this campus."
      >
        <DashboardEmptyState
          icon={Users}
          title="Campus not set"
          description="Your staff account needs a university before the directory can load."
        />
      </CampusFrame>
    )
  }

  const directory = await loadCampusStudentDirectory({
    university: university || "",
    kind,
    page,
    filters,
  })

  const totalPages = Math.max(1, Math.ceil(directory.total / CAMPUS_DIRECTORY_PAGE_SIZE))
  const hasActiveFilters = FILTER_PARAM_KEYS.some((key) => {
    const value = params[key]
    return typeof value === "string" ? Boolean(value.trim()) : false
  })

  const hrefFor = (next: { page?: number; kind?: string }) => {
    const query = new URLSearchParams()
    if (snapshot.access.university) query.set("campus", snapshot.access.university)
    if (snapshot.period?.id === "custom" && snapshot.period.from && snapshot.period.to) {
      query.set("from", snapshot.period.from)
      query.set("to", snapshot.period.to)
    } else if (snapshot.period?.id && snapshot.period.id !== "month") {
      query.set("range", snapshot.period.id)
    }
    query.set("kind", next.kind || kind)
    for (const key of FILTER_PARAM_KEYS) {
      const value = params[key]
      if (typeof value === "string" && value.trim()) query.set(key, value.trim())
    }
    const nextPage = next.page ?? page
    if (nextPage > 1) query.set("page", String(nextPage))
    return `/campus/people?${query.toString()}`
  }

  const filterSummary = summarizeDirectoryFilters(filters)

  return (
    <CampusFrame
      snapshot={snapshot}
      showRange={false}
      title="Partners & stakeholders"
      description={`${directory.university} directory. Browse students and alumni, open profiles, message, suspend, or mark graduates.`}
    >
      <PeopleDirectoryTabs active={kind} snapshot={snapshot} counts={{ [kind]: directory.total }} />

      <DashboardPanel
        title={kind === "alumni" ? "Alumni directory" : "Student directory"}
        badge={`${directory.total.toLocaleString()} total`}
        description={
          kind === "alumni"
            ? "Graduates linked to this campus. Filter or select rows, then Create group to save a cohort."
            : "Search and filter students, select rows if needed, then Create group (e.g. BBA, inactive 30+ days)."
        }
        action={
          <Button asChild size="sm" variant="outline" className="rounded-full">
            <Link href={campusQueryHref("/campus/people/groups", snapshot)}>View groups</Link>
          </Button>
        }
      >
        <div className="mb-4">
          <StudentDirectoryFilters kind={kind} />
        </div>

        {!directory.students.length ? (
          <DashboardEmptyState
            icon={Users}
            title={hasActiveFilters ? "No matches" : kind === "alumni" ? "No alumni on file" : "No students on file"}
            description={
              hasActiveFilters
                ? "Nothing matched these filters. Clear them or try a different search."
                : "SSO and campus profiles show here once people are attached to this university."
            }
          />
        ) : (
          <div className="space-y-4">
            <StudentDirectory
              students={directory.students}
              kind={kind}
              canMutate={canMutate}
              totalMatching={directory.total}
              filters={filters}
            />
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
              <p>
                Page {page} of {totalPages}
                {filterSummary.length ? ` · ${filterSummary.join(" · ")}` : ""}
              </p>
              <div className="flex gap-2">
                {page > 1 ? (
                  <Button asChild size="sm" variant="outline" className="rounded-full">
                    <Link href={hrefFor({ page: page - 1 })}>Previous</Link>
                  </Button>
                ) : null}
                {page < totalPages ? (
                  <Button asChild size="sm" variant="outline" className="rounded-full">
                    <Link href={hrefFor({ page: page + 1 })}>Next</Link>
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </DashboardPanel>

      <p className="text-sm text-muted-foreground">
        Looking for employer partners?{" "}
        <Link href={campusQueryHref("/campus/employers", snapshot)} className="text-primary hover:underline">
          Open the employers directory
        </Link>
        .
      </p>
    </CampusFrame>
  )
}
