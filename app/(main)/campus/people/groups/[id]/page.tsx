import Link from "next/link"
import { notFound } from "next/navigation"
import { UsersRound } from "lucide-react"
import { loadCampusPage } from "@/lib/campus/page-data"
import { directoryUniversity } from "@/lib/campus/directory"
import { getCampusDirectoryGroup } from "@/lib/campus/groups"
import { campusQueryHref } from "@/lib/campus/reports"
import { sameCampus } from "@/lib/jobs/curation"
import { createAdminClient } from "@/lib/supabase/admin"
import { PeopleDirectoryTabs } from "@/components/campus/PeopleDirectoryTabs"
import { CampusFrame } from "@/components/campus/CampusFrame"
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState"
import { DashboardPanel } from "@/components/dashboard/DashboardPanel"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default async function CampusGroupDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ campus?: string; range?: string; from?: string; to?: string }>
}) {
  const { id } = await params
  const { snapshot } = await loadCampusPage(searchParams, "view_actions")
  const university = snapshot.access.university
  const group = await getCampusDirectoryGroup(id)

  if (!group) notFound()
  if (
    university &&
    group.university &&
    !sameCampus(group.university, university) &&
    snapshot.access.role !== "admin"
  ) {
    notFound()
  }

  const admin = createAdminClient()
  const isEmployer = group.kind === "employers"

  const members: {
    id: string
    name: string
    secondary: string | null
    tertiary: string | null
    quaternary: string | null
    href: string
  }[] = []

  for (let i = 0; i < group.memberIds.length; i += 200) {
    const chunk = group.memberIds.slice(i, i + 200)
    if (isEmployer) {
      const { data } = await admin
        .from("recruiter_profiles")
        .select("id, company_name, industry, employee_count, website_url")
        .in("id", chunk)
      for (const row of data || []) {
        members.push({
          id: row.id,
          name: row.company_name || "Employer",
          secondary: row.industry || null,
          tertiary: row.employee_count || null,
          quaternary: row.website_url || null,
          href: `/company/${row.id}`,
        })
      }
    } else {
      const { data } = await admin
        .from("student_profiles")
        .select("id, degree, college, campus_student_id, graduation_year, profiles!inner(full_name)")
        .in("id", chunk)
      for (const row of data || []) {
        const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
        members.push({
          id: row.id,
          name: (profile as { full_name?: string | null } | null)?.full_name || "Student",
          secondary: row.campus_student_id || null,
          tertiary: row.degree || null,
          quaternary: row.college || (row.graduation_year != null ? String(row.graduation_year) : null),
          href: `/candidates/${row.id}`,
        })
      }
    }
  }

  members.sort((a, b) => a.name.localeCompare(b.name))

  return (
    <CampusFrame
      snapshot={snapshot}
      title="Partners & stakeholders"
      description={`${directoryUniversity(group.university)} · ${group.name}`}
    >
      <PeopleDirectoryTabs active="groups" snapshot={snapshot} />

      <DashboardPanel
        title={group.name}
        badge={`${group.memberCount.toLocaleString()} members`}
        description={
          group.description ||
          (group.summary.length ? group.summary.join(" · ") : "Directory group")
        }
        action={
          <Button asChild size="sm" variant="outline" className="rounded-full">
            <Link href={campusQueryHref(`/campus/people/groups?kind=${group.kind}`, snapshot)}>Back to groups</Link>
          </Button>
        }
      >
        {!members.length ? (
          <DashboardEmptyState
            icon={UsersRound}
            title="No members found"
            description="Members may have left the campus directory since this group was saved."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{isEmployer ? "Employer" : "Name"}</TableHead>
                  <TableHead>{isEmployer ? "Industry" : "Student ID"}</TableHead>
                  <TableHead>{isEmployer ? "Company size" : "Program"}</TableHead>
                  <TableHead>{isEmployer ? "Website" : "College / class"}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">
                      <Link href={row.href} className="text-primary hover:underline">
                        {row.name}
                      </Link>
                    </TableCell>
                    <TableCell className={isEmployer ? undefined : "font-data text-[13px] tabular-nums"}>
                      {row.secondary || "—"}
                    </TableCell>
                    <TableCell>{row.tertiary || "—"}</TableCell>
                    <TableCell>
                      {isEmployer && row.quaternary ? (
                        <a
                          href={row.quaternary}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          {row.quaternary.replace(/^https?:\/\//, "")}
                        </a>
                      ) : (
                        row.quaternary || "—"
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="mt-3 text-[13px] text-muted-foreground">
              Snapshot saved{" "}
              {new Date(group.createdAt).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
              {group.mode === "selection" ? " from a manual selection" : " from directory filters"}.
            </p>
          </div>
        )}
      </DashboardPanel>
    </CampusFrame>
  )
}
