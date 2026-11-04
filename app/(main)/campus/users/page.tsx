import { Shield } from "lucide-react"
import { campusPageData } from "@/lib/campus/page-data"
import { createClient } from "@/lib/supabase/server"
import { formatIobmStaffRole } from "@/lib/sso/iobm"
import { CampusFrame } from "@/components/campus/CampusFrame"
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState"
import { DashboardPanel } from "@/components/dashboard/DashboardPanel"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default async function CampusUsersPage({ searchParams }: { searchParams: Promise<{ campus?: string }> }) {
  const { campus } = await searchParams
  const snapshot = await campusPageData(campus, "view_actions")
  const university = snapshot.access.university
  const supabase = await createClient()

  let staffQuery = supabase.from("campus_staff").select("user_id, university, staff_role")
  if (university) staffQuery = staffQuery.eq("university", university)
  const { data: staffRows, error } = await staffQuery.limit(80)
  const staffIds = (staffRows || []).map((row) => row.user_id)
  const { data: names } = staffIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", staffIds)
    : { data: [] as { id: string; full_name: string | null }[] }
  const nameById = new Map((names || []).map((row) => [row.id, row.full_name]))
  const staff = (staffRows || []).map((row) => ({
    ...row,
    full_name: nameById.get(row.user_id) || null,
  }))

  const { data: pendingEmployers } = university
    ? await supabase.from("campus_employer_partners").select("id, status").eq("university", university).eq("status", "pending")
    : await supabase.from("campus_employer_partners").select("id, status").eq("status", "pending").limit(40)

  return (
    <CampusFrame
      snapshot={snapshot}
      title="Users & access"
      description="Student, alumni, and employer verification plus CDC roles. Escalations go to the CDC Super Admin. Permissions follow the IoBM staff role, not a second matrix."
    >
      <DashboardPanel title="CDC staff roles">
        {error || !staff?.length ? (
          <DashboardEmptyState
            icon={Shield}
            title="No staff roster yet"
            description="Campus SSO assigns director, advisor, coordinator, dean, faculty, or auditor when someone signs in through the faculty portal."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Campus</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map((row) => {
                return (
                  <TableRow key={row.user_id}>
                    <TableCell className="font-medium">{row.full_name || row.user_id.slice(0, 8)}</TableCell>
                    <TableCell>{formatIobmStaffRole(row.staff_role)}</TableCell>
                    <TableCell className="text-muted-foreground">{row.university}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </DashboardPanel>
      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardPanel title="Employer verification" badge={`${pendingEmployers?.length ?? 0} pending`}>
          <p className="text-sm text-muted-foreground">
            Review partnership requests under Employers. Unverified companies cannot post campus-restricted jobs.
          </p>
        </DashboardPanel>
        <DashboardPanel title="SSO identities">
          <p className="text-sm text-muted-foreground">
            Merge conflicts and deprovision leavers under Settings & Integrations. Student and alumni verification is the IoBM roster, not a second signup form.
          </p>
        </DashboardPanel>
      </div>
    </CampusFrame>
  )
}
