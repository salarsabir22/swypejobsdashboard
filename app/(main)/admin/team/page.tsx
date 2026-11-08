import { requireAdminModule } from "@/lib/admin/access"
import { createAdminClient } from "@/lib/supabase/admin"
import { AdminFrame } from "@/components/admin/AdminFrame"
import { AuditLogFilter, TeamInviteForm, TeamRoleSelect } from "@/components/admin/TeamAdminPanel"
import { DashboardPanel } from "@/components/dashboard/DashboardPanel"

export default async function AdminTeamPage() {
  const admin = await requireAdminModule("team")
  const supabase = createAdminClient()
  const [{ data: admins }, { data: staff }, { data: audit }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, created_at").eq("role", "admin").limit(100),
    supabase.from("platform_staff").select("user_id, staff_role, modules").limit(100),
    supabase
      .from("platform_audit_log")
      .select("id, created_at, action, entity, entity_id")
      .order("created_at", { ascending: false })
      .limit(100),
  ])

  return (
    <AdminFrame
      title="Team, roles, and security"
      description="Invite admins, set staff roles (modules follow role defaults), and filter the audit log."
      staffRole={admin.staffRole}
      mode="settings"
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardPanel title="Invite admin">
          <TeamInviteForm />
        </DashboardPanel>
        <DashboardPanel title="Admins">
          <ul className="space-y-3 text-[14px]">
            {(admins || []).map((a) => {
              const row = (staff || []).find((s) => s.user_id === a.id)
              return (
                <li key={a.id} className="space-y-2 rounded-xl border border-border p-3">
                  <p className="font-medium">{a.full_name || a.id}</p>
                  <p className="text-[13px] text-muted-foreground">
                    {(row?.modules || ["all"]).join(", ")}
                  </p>
                  <TeamRoleSelect userId={a.id} currentRole={row?.staff_role || "super_admin"} />
                </li>
              )
            })}
          </ul>
        </DashboardPanel>
      </div>
      <DashboardPanel title="Audit log">
        <AuditLogFilter rows={audit || []} />
      </DashboardPanel>
      <DashboardPanel title="2FA, SSO, IP allowlist, dual control">
        <p className="text-[14px] text-muted-foreground">
          Enforce SSO at the IdP. Dual-admin delete for a university is an automation_rules row, not a silent UI click.
          Moderator performance (queue time, overturns) will compute from employer_reviews + job_moderation timestamps.
        </p>
      </DashboardPanel>
    </AdminFrame>
  )
}
