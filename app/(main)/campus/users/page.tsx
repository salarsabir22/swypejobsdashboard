import { Shield } from "lucide-react"
import { loadCampusPage } from "@/lib/campus/page-data"
import { createClient } from "@/lib/supabase/server"
import { formatIobmStaffRole } from "@/lib/sso/iobm"
import { campusCapabilities } from "@/lib/campus/rbac"
import {
  STAFF_PERMISSIONS,
  canManageStaffAccess,
  isProtectedStaffRole,
  permissionsFromCapabilities,
} from "@/lib/campus/staff-permissions"
import { CampusFrame } from "@/components/campus/CampusFrame"
import { StaffAccessPanel, type StaffAccessRow } from "@/components/campus/StaffAccessPanel"
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState"
import { DashboardPanel } from "@/components/dashboard/DashboardPanel"

type StaffRow = {
  user_id: string
  university: string | null
  staff_role: string | null
  access_grants?: string[] | null
}

export default async function CampusUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ campus?: string; range?: string; from?: string; to?: string }>
}) {
  const { snapshot } = await loadCampusPage(searchParams, "view_actions")
  const access = snapshot.access
  const university = access.university
  const canManage = canManageStaffAccess(access)
  const supabase = await createClient()

  const baseQuery = () => {
    let query = supabase.from("campus_staff").select("user_id, university, staff_role, access_grants")
    if (university) query = query.eq("university", university)
    return query
  }
  let staffResult = await baseQuery().limit(200)
  if (staffResult.error) {
    // access_grants is new; keep the roster readable before the migration runs.
    let query = supabase.from("campus_staff").select("user_id, university, staff_role")
    if (university) query = query.eq("university", university)
    staffResult = (await query.limit(200)) as typeof staffResult
  }
  const staffRows = ((staffResult.error ? [] : staffResult.data) || []) as StaffRow[]

  const staffIds = staffRows.map((row) => row.user_id)
  const { data: names } = staffIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", staffIds)
    : { data: [] as { id: string; full_name: string | null }[] }
  const nameById = new Map((names || []).map((row) => [row.id, row.full_name]))

  const rows: StaffAccessRow[] = staffRows
    .map((row) => {
      const staffRole = (row.staff_role || "faculty") as StaffAccessRow["staffRole"]
      const grants = Array.isArray(row.access_grants) ? row.access_grants : null
      const caps = campusCapabilities({
        ...access,
        staffRole: staffRole as typeof access.staffRole,
        grants,
      })
      return {
        userId: row.user_id,
        name: nameById.get(row.user_id) || null,
        staffRole,
        staffRoleLabel: formatIobmStaffRole(row.staff_role),
        university: row.university,
        grants,
        permissions: permissionsFromCapabilities([...caps]),
        locked: isProtectedStaffRole(row.staff_role) || access.role === "admin",
      }
    })
    .sort((a, b) => {
      if (a.locked !== b.locked) return a.locked ? -1 : 1
      return (a.name || "").localeCompare(b.name || "")
    })

  const { data: pendingEmployers } = university
    ? await supabase.from("employer_invitations").select("id").eq("university", university).eq("status", "pending")
    : await supabase.from("employer_invitations").select("id").eq("status", "pending").limit(40)

  return (
    <CampusFrame
      snapshot={snapshot}
      showRange={false}
      title="Users & access"
      description="Every CDC staff profile on this campus, with on/off switches for what each person can open. Directors keep full access; only the CDC Super Admin can flip these."
    >
      <DashboardPanel
        title="CDC staff access"
        badge={`${rows.length} ${rows.length === 1 ? "person" : "people"}`}
        description={
          canManage
            ? "Turn on job approvals for an advisor, or limit someone to international programs. Switches override the IoBM staff-role default for that person only."
            : "Read-only. Only the CDC Super Admin (director) or a platform admin can change these switches."
        }
      >
        {staffResult.error || !rows.length ? (
          <DashboardEmptyState
            icon={Shield}
            title="No staff roster yet"
            description="Campus SSO assigns director, advisor, coordinator, dean, faculty, or auditor when someone signs in through the faculty portal."
          />
        ) : (
          <StaffAccessPanel rows={rows} canManage={canManage} />
        )}
      </DashboardPanel>

      <DashboardPanel title="How the switches map" description="Each switch opens a set of console pages for that person.">
        <ul className="grid gap-2 sm:grid-cols-2">
          {STAFF_PERMISSIONS.map((permission) => (
            <li key={permission.id} className="rounded-xl border border-border p-3">
              <p className="text-sm font-medium">{permission.label}</p>
              <p className="text-xs text-muted-foreground">{permission.description}</p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          Access changes take effect on the next page load. Clearing a person’s switches removes everything except the CDC
          home page.
        </p>
      </DashboardPanel>

      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardPanel title="Employer verification" badge={`${pendingEmployers?.length ?? 0} pending`}>
          <p className="text-sm text-muted-foreground">
            Review partnership requests under Employers. Unverified companies cannot post campus-restricted jobs.
          </p>
        </DashboardPanel>
        <DashboardPanel title="SSO identities">
          <p className="text-sm text-muted-foreground">
            Merge conflicts and deprovision leavers under Settings & Integrations. Student and alumni verification is the
            IoBM roster, not a second signup form.
          </p>
        </DashboardPanel>
      </div>
    </CampusFrame>
  )
}
