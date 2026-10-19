import { requireAdminModule } from "@/lib/admin/access"
import { createClient } from "@/lib/supabase/server"
import { AdminFrame } from "@/components/admin/AdminFrame"
import { BulkReportClose } from "@/components/admin/BulkReportClose"
import { ReportDecision } from "@/components/admin/ReportDecision"
import { AdminFilterTabs, AdminPagination } from "@/components/admin/AdminPagination"
import { DashboardPanel } from "@/components/dashboard/DashboardPanel"
import { formatDate } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { inLastDays } from "@/lib/campus/helpers"

const PAGE_SIZE = 10

export default async function AdminSafetyPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string; status?: string }>
}) {
  const admin = await requireAdminModule("safety")
  const supabase = await createClient()
  const params = (await searchParams) || {}
  const page = Math.max(1, Number.parseInt(params.page || "1", 10) || 1)
  const status = params.status === "open" || params.status === "closed" ? params.status : "all"
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from("reports")
    .select("id, reason, details, status, created_at, reporter_id, reported_id", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to)

  if (status === "open") query = query.or("status.is.null,status.eq.open,status.eq.pending")
  if (status === "closed") query = query.in("status", ["reviewed", "dismissed"])

  const { data: reports, count } = await query
  const rows = reports || []
  const total = count || 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const ids = [...new Set(rows.flatMap((r) => [r.reporter_id, r.reported_id]))]
  const { data: profiles } = ids.length
    ? await supabase.from("profiles").select("id, full_name, role").in("id", ids)
    : { data: [] }
  const byId = new Map((profiles || []).map((p) => [p.id, p]))
  const counts = new Map<string, number>()
  for (const r of rows) counts.set(r.reported_id, (counts.get(r.reported_id) || 0) + 1)
  const spike = rows.filter((r) => inLastDays(r.created_at, 1)).length

  const hrefFor = (nextPage: number, nextStatus = status) => {
    const q = new URLSearchParams()
    if (nextStatus !== "all") q.set("status", nextStatus)
    if (nextPage > 1) q.set("page", String(nextPage))
    const qs = q.toString()
    return qs ? `/admin/safety?${qs}` : "/admin/safety"
  }

  return (
    <AdminFrame
      title="Reports, flags, and safety"
      description="User reports with SLA, repeat offenders, and escalation. Close items so they leave the open queue."
      staffRole={admin.staffRole}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <AdminFilterTabs
          current={status}
          tabs={[
            { value: "all", label: "All" },
            { value: "open", label: "Open" },
            { value: "closed", label: "Closed" },
          ]}
          hrefFor={(value) => hrefFor(1, value)}
        />
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[13px] text-muted-foreground">
            {total} report{total === 1 ? "" : "s"} · {spike} on this page in 24h
          </p>
          {status === "open" || status === "all" ? (
            <BulkReportClose
              openIds={rows
                .filter((r) => !r.status || r.status === "open" || r.status === "pending")
                .map((r) => r.id)}
            />
          ) : null}
        </div>
      </div>

      <DashboardPanel title="Queue" badge={`${rows.length} shown`}>
        <div className="space-y-3">
          {rows.map((row) => {
            const target = byId.get(row.reported_id)
            const open = !row.status || row.status === "open" || row.status === "pending"
            const sla = open && !inLastDays(row.created_at, 1)
            return (
              <div key={row.id} className="rounded-2xl border border-border p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{row.reason}</Badge>
                  <Badge variant={sla ? "destructive" : "outline"}>{sla ? "SLA breach" : row.status || "open"}</Badge>
                  <span className="text-[13px] text-muted-foreground">{formatDate(row.created_at)}</span>
                </div>
                <p className="mt-2 text-[14px]">
                  {target?.full_name || row.reported_id} · {target?.role} · {counts.get(row.reported_id) || 1} reports
                </p>
                {row.details ? <p className="mt-1 text-[13px] text-muted-foreground">{row.details}</p> : null}
                <div className="mt-3">
                  <ReportDecision id={row.id} reportedId={row.reported_id} initialStatus={row.status} />
                </div>
              </div>
            )
          })}
          {!rows.length ? <p className="text-[14px] text-muted-foreground">No reports in this filter.</p> : null}
        </div>
      </DashboardPanel>

      <AdminPagination page={page} totalPages={totalPages} hrefFor={(p) => hrefFor(p)} />
    </AdminFrame>
  )
}
