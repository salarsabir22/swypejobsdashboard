import { redirect } from "next/navigation"
import { Handshake } from "lucide-react"
import { getRequestUser } from "@/lib/nav/app-shell-user"
import { PartnershipRequestForm } from "@/components/portal/PartnershipRequestForm"
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState"
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader"
import { StatusBadge } from "@/components/ui/status-badge"

export default async function PartnershipsPage() {
  const { supabase, user } = await getRequestUser()
  if (!user) redirect("/login?next=/partnerships")

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
  if (profile?.role !== "recruiter") redirect("/discover")

  const { data: company } = await supabase.from("recruiter_profiles").select("company_name").eq("id", user.id).maybeSingle()
  const { data: rows, error } = await supabase
    .from("campus_employer_partners")
    .select("id, university, tier, notes, created_at")
    .eq("recruiter_id", user.id)
    .order("created_at", { ascending: false })

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <DashboardPageHeader
        eyebrow="Hiring"
        title="Campus partnerships"
        description="A pending request does not unlock student records. Each campus reviews independently."
      />
      {error ? (
        <DashboardEmptyState
          icon={Handshake}
          title="Partnerships aren’t available yet"
          description="You can still post jobs to the open network. Campus-only listings unlock after a campus accepts you."
          primaryAction={{ href: "/jobs/new", label: "Post a job" }}
        />
      ) : (
        <>
          {!rows?.length ? (
            <DashboardEmptyState
              icon={Handshake}
              title="No campus requests yet"
              description="Ask a career office to list you as a partner. Until then, students on the open network can still see your public jobs."
            />
          ) : (
            <ul className="space-y-2">
              {rows.map((row) => (
                <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3">
                  <div>
                    <p className="font-medium">{row.university}</p>
                    {row.notes ? <p className="text-sm text-muted-foreground">{row.notes}</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <StatusBadge value="active" />
                    {row.tier ? <StatusBadge value={row.tier} /> : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <PartnershipRequestForm companyName={company?.company_name || "Company"} />
        </>
      )}
    </div>
  )
}
