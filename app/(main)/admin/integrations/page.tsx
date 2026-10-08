import { requireAdmin } from "@/lib/admin/access"
import { createClient } from "@/lib/supabase/server"
import { AdminFrame } from "@/components/admin/AdminFrame"
import { DashboardPanel } from "@/components/dashboard/DashboardPanel"

export default async function AdminIntegrationsPage() {
  const admin = await requireAdmin()
  const supabase = await createClient()
  const { data: hooks } = await supabase.from("api_webhooks").select("*")

  return (
    <AdminFrame
      title="Integrations and developer tools"
      description="Webhooks, ATS, SSO/SIS, and third-party health. Sandbox is an environment flag, not a user toggle on production data."
      staffRole={admin.staffRole}
    >
      <DashboardPanel title="Webhooks">
        {(hooks || []).length ? (
          <ul className="space-y-2 text-[14px]">
            {hooks!.map((h) => (
              <li key={h.id}>
                {h.name} · {h.is_active ? "live" : "off"} · {h.last_error || "no errors"}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[14px] text-muted-foreground">No api_webhooks rows. Add Greenhouse/Lever/Workday callbacks here when those connectors ship.</p>
        )}
      </DashboardPanel>
      <DashboardPanel title="SSO / SIS / messaging / payments">
        <p className="text-[14px] text-muted-foreground">
          University SSO is per university_orgs.domain. Email, SMS, push, and Stripe status should be scraped from those
          vendors into this panel — until then treat a failed broadcast insert as the error log.
        </p>
      </DashboardPanel>
    </AdminFrame>
  )
}
