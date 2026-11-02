import Link from "next/link"
import { redirect } from "next/navigation"
import { Globe } from "lucide-react"
import { getRequestUser } from "@/lib/nav/app-shell-user"
import { deadlineLabel } from "@/lib/jobs/deadline"
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState"
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader"
import { StatusBadge } from "@/components/ui/status-badge"
import { cn } from "@/lib/utils"

const KIND_LABEL: Record<string, string> = {
  study_abroad: "Study abroad",
  exchange: "Exchange",
  dual_degree: "Dual degree",
  scholarship: "Scholarship",
}

export default async function OpportunitiesPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { kind } = await searchParams
  const { supabase, user } = await getRequestUser()
  if (!user) redirect("/login?next=/opportunities")

  const { data, error } = await supabase
    .from("international_opportunities")
    .select("id, kind, title, country, organization, summary, eligibility, visa_url, apply_url, deadline")
    .eq("is_active", true)
    .order("deadline", { ascending: true })
  const current = kind || "all"
  const rows = (error ? [] : data || []).filter((row) => current === "all" || row.kind === current)

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <DashboardPageHeader
        eyebrow="Campus"
        title="International opportunities"
        description="Study abroad, exchange, dual degrees, and scholarships. Visa guidance is linked on each listing."
      />
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Opportunity type">
        {[["all", "All"], ...Object.entries(KIND_LABEL)].map(([id, label]) => {
          const active = current === id
          return (
            <Link
              key={id}
              href={id === "all" ? "/opportunities" : `/opportunities?kind=${id}`}
              role="tab"
              aria-selected={active}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm font-medium",
                active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-secondary"
              )}
            >
              {label}
            </Link>
          )
        })}
      </div>
      {error ? (
        <DashboardEmptyState
          icon={Globe}
          title="Listings aren’t available yet"
          description="Your career office will publish study-abroad and scholarship options here."
          primaryAction={{ href: "/discover", label: "Browse jobs" }}
        />
      ) : !rows.length ? (
        <DashboardEmptyState
          icon={Globe}
          title="Nothing listed yet"
          description="When the career office adds a program, it will show up in this list."
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.id} className="space-y-2 rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge value={row.kind} />
                {row.country ? <span className="text-sm text-muted-foreground">{row.country}</span> : null}
              </div>
              <h2 className="font-heading text-lg font-semibold">{row.title}</h2>
              {row.organization ? <p className="text-sm text-muted-foreground">{row.organization}</p> : null}
              {row.summary ? <p className="text-sm leading-relaxed">{row.summary}</p> : null}
              {row.eligibility ? <p className="text-sm text-muted-foreground">Eligibility: {row.eligibility}</p> : null}
              <p className="text-sm text-muted-foreground">{deadlineLabel(row.deadline) || "No deadline"}</p>
              <div className="flex flex-wrap gap-3 text-sm">
                {row.apply_url ? (
                  <a className="font-medium text-primary hover:underline" href={row.apply_url} target="_blank" rel="noreferrer">
                    Apply
                  </a>
                ) : null}
                {row.visa_url ? (
                  <a className="font-medium text-primary hover:underline" href={row.visa_url} target="_blank" rel="noreferrer">
                    Visa information
                  </a>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
