import { requireAdmin } from "@/lib/admin/access"
import { createClient } from "@/lib/supabase/server"
import { AdminFrame } from "@/components/admin/AdminFrame"
import { DashboardPanel } from "@/components/dashboard/DashboardPanel"

export default async function AdminTeamPage() {
  const admin = await requireAdmin()
  const supabase = await createClient()
  const { data: admins } = await supabase.from("profiles").select("id, full_name, created_at").eq("role", "admin")
  const { data: staff } = await supabase.from("platform_staff").select("*")
  const { data: audit } = await supabase.from("platform_audit_log").select("*").order("created_at", { ascending: false }).limit(30)

  return (
    <AdminFrame
      title="Team, roles, and security"
      description="RBAC: super admin, moderator, support, analyst, finance, read-only. Module permissions live on platform_staff.modules."
      staffRole={admin.staffRole}
    >
      <DashboardPanel title="Admins">
        <ul className="space-y-2 text-[14px]">
          {(admins || []).map((a) => {
            const row = (staff || []).find((s) => s.user_id === a.id)
            return (
              <li key={a.id}>
                {a.full_name || a.id} · {row?.staff_role || "super_admin"} · {(row?.modules || ["all"]).join(", ")}
              </li>
            )
          })}
        </ul>
      </DashboardPanel>
      <DashboardPanel title="Audit log">
        {(audit || []).length ? (
          <ul className="max-h-80 space-y-2 overflow-auto text-[13px]">
            {audit!.map((row) => (
              <li key={row.id}>
                {row.created_at}: {row.action} {row.entity} {row.entity_id}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[14px] text-muted-foreground">Empty until staff take a queued action.</p>
        )}
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
