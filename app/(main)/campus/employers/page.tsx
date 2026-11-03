import { Building2 } from "lucide-react"
import { campusPageData } from "@/lib/campus/page-data"
import { createClient } from "@/lib/supabase/server"
import { CampusFrame } from "@/components/campus/CampusFrame"
import { EmployerInviteForm } from "@/components/campus/EmployerInviteForm"
import { PartnershipReviewButtons } from "@/components/campus/PartnershipReviewButtons"
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState"
import { DashboardPanel } from "@/components/dashboard/DashboardPanel"
import { StatusBadge } from "@/components/ui/status-badge"

export default async function CampusEmployersPage({ searchParams }: { searchParams: Promise<{ campus?: string }> }) {
  const { campus } = await searchParams
  const snapshot = await campusPageData(campus, "view_actions")
  const university = snapshot.access.university || snapshot.attention[0]?.university || "Campus"
  const supabase = await createClient()
  const { data: partners, error } = await supabase
    .from("campus_employer_partners")
    .select("id, company_name, status, notes, recruiter_id")
    .eq("university", university)
    .order("created_at", { ascending: false })
  const { data: invites } = await supabase
    .from("employer_invitations")
    .select("id, company_name, contact_email, status, created_at")
    .eq("university", university)
    .order("created_at", { ascending: false })
    .limit(20)

  return (
    <CampusFrame snapshot={snapshot} title="Employers & partnerships" description="Invite a company, review incoming requests, and keep one employer record with many campus relationships.">
      <DashboardPanel title="Invite an employer">
        <EmployerInviteForm university={university} />
      </DashboardPanel>
      <DashboardPanel title="Partnership requests">
        {error ? (
          <DashboardEmptyState
            icon={Building2}
            title="Partnerships aren’t available yet"
            description="Invite employers below. Incoming requests will show here once this campus workspace is live."
          />
        ) : !partners?.length ? (
          <p className="text-sm text-muted-foreground">No partnership requests yet.</p>
        ) : (
          <ul className="space-y-3">
            {partners.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-secondary/40 px-4 py-3">
                <div className="space-y-1.5">
                  <p className="text-sm font-medium">{row.company_name || row.recruiter_id}</p>
                  {row.notes ? <p className="text-sm text-muted-foreground">{row.notes}</p> : null}
                  <StatusBadge value={row.status} />
                </div>
                <PartnershipReviewButtons id={row.id} />
              </li>
            ))}
          </ul>
        )}
      </DashboardPanel>
      <DashboardPanel title="Invitations sent">
        {invites?.length ? (
          <ul className="space-y-2">
            {invites.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border px-4 py-3 text-sm">
                <div>
                  <p className="font-medium">{row.company_name}</p>
                  <p className="text-muted-foreground">{row.contact_email}</p>
                </div>
                <StatusBadge value={row.status} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No invitations sent yet.</p>
        )}
      </DashboardPanel>
    </CampusFrame>
  )
}
