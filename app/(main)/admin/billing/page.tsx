import { requireAdmin } from "@/lib/admin/access"
import { createClient } from "@/lib/supabase/server"
import { AdminFrame } from "@/components/admin/AdminFrame"
import { DashboardKpiCard } from "@/components/dashboard/DashboardKpiCard"
import { DashboardPanel } from "@/components/dashboard/DashboardPanel"
import { fmtNum } from "@/lib/campus/format"
import { CreditCard } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export default async function AdminBillingPage() {
  const admin = await requireAdmin()
  const supabase = await createClient()
  const { data: rows } = await supabase.from("employer_billing").select("*, recruiter_profiles(company_name)")
  const list = rows || []
  const mrr = list.reduce((s, r) => s + Number(r.mrr || 0), 0)

  return (
    <AdminFrame
      title="Revenue and billing"
      description="Plans and MRR from employer_billing. Stripe invoices, refunds, and promo codes attach here when the billing webhook is live."
      staffRole={admin.staffRole}
    >
      <DashboardKpiCard icon={CreditCard} label="MRR" value={list.length ? fmtNum(mrr) : "—"} hint="ARR is 12× when plans are annualized" />
      <DashboardPanel title="Subscriptions">
        {list.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employer</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>MRR</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((row) => {
                const company = Array.isArray(row.recruiter_profiles) ? row.recruiter_profiles[0] : row.recruiter_profiles
                return (
                  <TableRow key={row.recruiter_id}>
                    <TableCell>{company?.company_name || row.recruiter_id}</TableCell>
                    <TableCell>{row.plan}</TableCell>
                    <TableCell>{row.status}</TableCell>
                    <TableCell className="tabular-nums">{fmtNum(Number(row.mrr || 0))}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        ) : (
          <p className="text-[14px] text-muted-foreground">
            No Stripe customers synced. Sponsored jobs can still be featured from the job queue. Pricing experiments
            belong in ranking_weights and feature_flags.
          </p>
        )}
      </DashboardPanel>
    </AdminFrame>
  )
}
