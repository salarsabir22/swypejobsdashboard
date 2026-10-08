import { requireAdmin } from "@/lib/admin/access"
import { createClient } from "@/lib/supabase/server"
import { AdminFrame } from "@/components/admin/AdminFrame"
import { DashboardPanel } from "@/components/dashboard/DashboardPanel"

export default async function AdminCompliancePage() {
  const admin = await requireAdmin()
  const supabase = await createClient()
  const { data: legal } = await supabase.from("legal_acceptances").select("document, version").limit(20)
  const { data: incidents } = await supabase.from("incident_log").select("*").order("created_at", { ascending: false }).limit(20)

  return (
    <AdminFrame
      title="Compliance and legal"
      description="Policy versions, FERPA/GDPR/CCPA/EEOC controls, retention, incidents, and geo rules."
      staffRole={admin.staffRole}
    >
      <DashboardPanel title="Terms and privacy acceptance">
        {(legal || []).length ? (
          <ul className="text-[14px]">
            {legal!.map((row, i) => (
              <li key={i}>
                {row.document} v{row.version}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[14px] text-muted-foreground">
            Record acceptances in legal_acceptances at signup. Current public docs: /terms and /privacy.
          </p>
        )}
      </DashboardPanel>
      <DashboardPanel title="Incidents and breach checklist">
        {(incidents || []).length ? (
          <ul className="space-y-2 text-[14px]">
            {incidents!.map((i) => (
              <li key={i.id}>
                {i.title} · {i.severity} · {i.status}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[14px] text-muted-foreground">
            Use incident_log for breaches. Checklist: contain, notify DPO, notify users if required, rotate keys, write the postmortem.
          </p>
        )}
      </DashboardPanel>
      <DashboardPanel title="Retention, consent, accessibility, geo">
        <ul className="list-disc space-y-1 pl-5 text-[14px] text-muted-foreground">
          <li>Retention: swipe and chat auto-delete windows belong in a scheduled job, not a silent UI toggle.</li>
          <li>Consent logs: campus_demographics.consent_at plus legal_acceptances.</li>
          <li>Visa/work-auth copy rules: job_flags already catch discriminatory language.</li>
          <li>WCAG: keep contrast on this console; public pages use the existing token set.</li>
          <li>Geo-blocking is an edge/WAF rule, not an in-app table.</li>
        </ul>
      </DashboardPanel>
    </AdminFrame>
  )
}
