import Link from "next/link"
import { UsersRound } from "lucide-react"
import { loadCampusPage } from "@/lib/campus/page-data"
import { canCampus } from "@/lib/campus/rbac"
import { directoryUniversity } from "@/lib/campus/directory"
import { listCampusDirectoryGroups, type CampusDirectoryGroupKind } from "@/lib/campus/groups"
import { campusQueryHref } from "@/lib/campus/reports"
import { PeopleDirectoryTabs } from "@/components/campus/PeopleDirectoryTabs"
import { CampusGroupsList } from "@/components/campus/CampusGroupsList"
import { CampusFrame } from "@/components/campus/CampusFrame"
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState"
import { DashboardPanel } from "@/components/dashboard/DashboardPanel"
import { Button } from "@/components/ui/button"

function parseKind(value: string | undefined): CampusDirectoryGroupKind {
  if (value === "alumni" || value === "employers") return value
  return "students"
}

export default async function CampusGroupsPage({
  searchParams,
}: {
  searchParams: Promise<{ campus?: string; kind?: string; range?: string; from?: string; to?: string }>
}) {
  const { snapshot, params } = await loadCampusPage(searchParams, "view_actions")
  const kind = parseKind(params.kind)
  const university = snapshot.access.university
  const canMutate = canCampus(snapshot.access, "mutate")

  if (!university && snapshot.access.role !== "admin") {
    return (
      <CampusFrame snapshot={snapshot} title="Partners & stakeholders" description="Campus directory groups.">
        <DashboardEmptyState
          icon={UsersRound}
          title="Campus not set"
          description="Your staff account needs a university before groups can load."
        />
      </CampusFrame>
    )
  }

  let groups = [] as Awaited<ReturnType<typeof listCampusDirectoryGroups>>
  let loadError: string | null = null
  try {
    groups = await listCampusDirectoryGroups({
      university: directoryUniversity(university || ""),
      kind,
    })
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Could not load groups."
  }

  const createHref =
    kind === "employers" ? "/campus/employers" : `/campus/people?kind=${kind}`
  const title =
    kind === "employers" ? "Employer groups" : kind === "alumni" ? "Alumni groups" : "Student groups"

  return (
    <CampusFrame
      snapshot={snapshot}
      title="Partners & stakeholders"
      description="Named cohorts saved from student, alumni, or employer directories."
    >
      <PeopleDirectoryTabs active="groups" snapshot={snapshot} counts={{ groups: groups.length }} />

      <DashboardPanel
        title={title}
        badge={`${groups.length.toLocaleString()} groups`}
        description="Create a group from filtered results or selected rows in the matching directory."
        action={
          <Button asChild size="sm" className="rounded-full">
            <Link href={campusQueryHref(createHref, snapshot)}>+ Create from directory</Link>
          </Button>
        }
      >
        {loadError ? (
          <p className="text-sm text-destructive">{loadError}</p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant={kind === "students" ? "default" : "outline"} className="rounded-full">
                <Link href={campusQueryHref("/campus/people/groups?kind=students", snapshot)}>Student groups</Link>
              </Button>
              <Button asChild size="sm" variant={kind === "alumni" ? "default" : "outline"} className="rounded-full">
                <Link href={campusQueryHref("/campus/people/groups?kind=alumni", snapshot)}>Alumni groups</Link>
              </Button>
              <Button asChild size="sm" variant={kind === "employers" ? "default" : "outline"} className="rounded-full">
                <Link href={campusQueryHref("/campus/people/groups?kind=employers", snapshot)}>Employer groups</Link>
              </Button>
            </div>
            <CampusGroupsList groups={groups} canMutate={canMutate} />
          </div>
        )}
      </DashboardPanel>
    </CampusFrame>
  )
}
