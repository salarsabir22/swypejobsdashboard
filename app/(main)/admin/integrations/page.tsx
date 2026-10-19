import { requireAdminModule } from "@/lib/admin/access"
import { createClient } from "@/lib/supabase/server"
import { AdminFrame } from "@/components/admin/AdminFrame"
import { WebhookManager } from "@/components/admin/WebhookManager"
import { DashboardPanel } from "@/components/dashboard/DashboardPanel"

export default async function AdminIntegrationsPage() {
  const admin = await requireAdminModule("integrations")
  const supabase = await createClient()
  const { data: hooks } = await supabase.from("api_webhooks").select("id, name, url, is_active, last_error")

  return (
    <AdminFrame
      title="Integrations and developer tools"
      description="Register webhook callbacks and toggle them. Delivery health still depends on connector workers."
      staffRole={admin.staffRole}
      mode="settings"
    >
      <DashboardPanel title="Webhooks">
        <WebhookManager
          hooks={(hooks || []).map((h) => ({
            id: h.id,
            name: h.name,
            url: h.url,
            is_active: Boolean(h.is_active),
            last_error: h.last_error,
          }))}
        />
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
