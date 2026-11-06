import Link from "next/link"
import { Building2 } from "lucide-react"
import { loadCampusPage } from "@/lib/campus/page-data"
import { canCampus } from "@/lib/campus/rbac"
import { campusQueryHref } from "@/lib/campus/reports"
import {
  CAMPUS_EMPLOYER_DIRECTORY_PAGE_SIZE,
  loadCampusEmployerDirectory,
  parseCampusEmployerDirectoryFilters,
  summarizeEmployerDirectoryFilters,
} from "@/lib/campus/employer-directory"
import { PeopleDirectoryTabs } from "@/components/campus/PeopleDirectoryTabs"
import { EmployerDirectory } from "@/components/campus/EmployerDirectory"
import { EmployerDirectoryFilters } from "@/components/campus/EmployerDirectoryFilters"
import { EmployerInviteForm } from "@/components/campus/EmployerInviteForm"
import { CampusFrame } from "@/components/campus/CampusFrame"
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState"
import { DashboardPanel } from "@/components/dashboard/DashboardPanel"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { createClient } from "@/lib/supabase/server"

const FILTER_PARAM_KEYS = ["q", "industry", "size", "inactive", "inactive_n", "suspended"] as const

export default async function CampusEmployersPage({
  searchParams,
}: {
  searchParams: Promise<{
    campus?: string
    q?: string
    page?: string
    range?: string
    from?: string
    to?: string
    industry?: string
    size?: string
    inactive?: string
    inactive_n?: string
    suspended?: string
  }>
}) {
  const { snapshot, params } = await loadCampusPage(searchParams, "view_actions")
  const filters = parseCampusEmployerDirectoryFilters(params)
  const page = Math.max(1, Number.parseInt(String(params.page || "1"), 10) || 1)
  const university = snapshot.access.university
  const canMutate = canCampus(snapshot.access, "mutate")

  if (!university && snapshot.access.role !== "admin") {
    return (
      <CampusFrame
        snapshot={snapshot}
        title="Partners & stakeholders"
        description="Employer directory for this campus."
      >
        <DashboardEmptyState
          icon={Building2}
          title="Campus not set"
          description="Your staff account needs a university before the employer directory can load."
        />
      </CampusFrame>
    )
  }

  const directory = await loadCampusEmployerDirectory({
    university: university || "",
    page,
    filters,
  })

  const supabase = await createClient()
  const { data: invites } = await supabase
    .from("employer_invitations")
    .select("id, company_name, contact_email, status, created_at")
    .eq("university", directory.university)
    .order("created_at", { ascending: false })
    .limit(40)

  const totalPages = Math.max(1, Math.ceil(directory.total / CAMPUS_EMPLOYER_DIRECTORY_PAGE_SIZE))
  const hasActiveFilters = FILTER_PARAM_KEYS.some((key) => {
    const value = params[key]
    return typeof value === "string" ? Boolean(value.trim()) : false
  })
  const filterSummary = summarizeEmployerDirectoryFilters(filters)

  const hrefFor = (nextPage: number) => {
    const query = new URLSearchParams()
    if (snapshot.access.university) query.set("campus", snapshot.access.university)
    if (snapshot.period?.id === "custom" && snapshot.period.from && snapshot.period.to) {
      query.set("from", snapshot.period.from)
      query.set("to", snapshot.period.to)
    } else if (snapshot.period?.id && snapshot.period.id !== "month") {
      query.set("range", snapshot.period.id)
    }
    for (const key of FILTER_PARAM_KEYS) {
      const value = params[key]
      if (typeof value === "string" && value.trim()) query.set(key, value.trim())
    }
    if (nextPage > 1) query.set("page", String(nextPage))
    return `/campus/employers?${query.toString()}`
  }

  return (
    <CampusFrame
      snapshot={snapshot}
      title="Partners & stakeholders"
      description={`${directory.university} employer directory — search, filter, message, suspend, or create groups.`}
    >
      <PeopleDirectoryTabs active="employers" snapshot={snapshot} counts={{ employers: directory.total }} />

      <DashboardPanel
        title="Employer directory"
        badge={`${directory.total.toLocaleString()} total`}
        description="Search by company name, filter by industry or size, select rows, then create a group."
        action={
          <Button asChild size="sm" variant="outline" className="rounded-full">
            <Link href={campusQueryHref("/campus/people/groups?kind=employers", snapshot)}>View groups</Link>
          </Button>
        }
      >
        <div className="mb-4">
          <EmployerDirectoryFilters />
        </div>

        {directory.error ? (
          <DashboardEmptyState
            icon={Building2}
            title="Partnerships aren’t available yet"
            description="Invite employers below. Incoming requests will show here once this campus workspace is live."
          />
        ) : !directory.employers.length ? (
          <DashboardEmptyState
            icon={Building2}
            title={hasActiveFilters ? "No matches" : "No employers on file"}
            description={
              hasActiveFilters
                ? "Nothing matched these filters. Clear them or try a different search."
                : "Invite employers below. Verified partners appear here with jobs and hire stats."
            }
          />
        ) : (
          <div className="space-y-4">
            <EmployerDirectory
              employers={directory.employers}
              canMutate={canMutate}
              totalMatching={directory.selectableTotal}
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
                    <Link href={hrefFor(page - 1)}>Previous</Link>
                  </Button>
                ) : null}
                {page < totalPages ? (
                  <Button asChild size="sm" variant="outline" className="rounded-full">
                    <Link href={hrefFor(page + 1)}>Next</Link>
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </DashboardPanel>

      {canMutate ? (
        <DashboardPanel title="Invite an employer">
          <EmployerInviteForm university={directory.university} />
        </DashboardPanel>
      ) : null}

      <DashboardPanel title="Invitations sent" badge={`${invites?.length || 0}`}>
        {invites?.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invites.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.company_name}</TableCell>
                  <TableCell>{row.contact_email}</TableCell>
                  <TableCell>
                    <StatusBadge value={row.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.created_at ? new Date(row.created_at).toLocaleDateString() : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">No invitations sent yet.</p>
        )}
      </DashboardPanel>
    </CampusFrame>
  )
}
