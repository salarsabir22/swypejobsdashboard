import { requireAdminModule } from "@/lib/admin/access"
import { createAdminClient } from "@/lib/supabase/admin"
import { AdminFrame } from "@/components/admin/AdminFrame"
import { UniversityCreateForm } from "@/components/admin/UniversityCreateForm"
import { UniversityDecision } from "@/components/admin/UniversityDecision"
import { DashboardPanel } from "@/components/dashboard/DashboardPanel"
import { countBy } from "@/lib/campus/helpers"
import { BreakdownList } from "@/components/campus/BreakdownList"

export default async function AdminUniversitiesPage() {
  const admin = await requireAdminModule("universities")
  const sb = createAdminClient()
  const [{ data: orgs, error: orgsError }, { data: students }, { data: staff }] = await Promise.all([
    sb.from("university_orgs").select("id, name, plan, status, domain, ferpa_signed").order("created_at", { ascending: false }).limit(100),
    sb.from("student_profiles").select("university").not("university", "is", null).limit(2000),
    sb.from("campus_staff").select("university, staff_role, user_id").limit(500),
  ])
  const bySchool = countBy((students || []).map((s) => s.university))

  return (
    <AdminFrame
      title="University management"
      description="Onboard campuses, whitelist domains, track FERPA agreements, and watch adoption health."
      staffRole={admin.staffRole}
      missingTables={orgsError ? ["university_orgs"] : undefined}
    >
      <BreakdownList title="Students by listed university" rows={bySchool} />
      <DashboardPanel title="Onboard campus">
        <UniversityCreateForm />
      </DashboardPanel>
      <DashboardPanel title="Contracts and branding">
        {(orgs || []).length ? (
          <ul className="space-y-4">
            {orgs!.map((o) => (
              <li key={o.id} className="space-y-2">
                <div className="text-[14px]">
                  <span className="font-medium">{o.name}</span>
                  {" · "}
                  {o.plan || "no plan"}
                </div>
                <UniversityDecision
                  orgId={o.id}
                  initialStatus={o.status}
                  initialDomain={o.domain}
                  ferpaSigned={Boolean(o.ferpa_signed)}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[14px] text-muted-foreground">
            No campuses yet. Create one above, then approve, set domain, and toggle FERPA. Career-office logins still use
            campus_staff.
          </p>
        )}
      </DashboardPanel>
      <DashboardPanel title="University admins">
        {(staff || []).length ? (
          <ul className="space-y-2 text-[14px]">
            {staff!.map((s) => (
              <li key={s.user_id}>
                {s.university} · {s.staff_role}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[14px] text-muted-foreground">
            No campus_staff rows yet. CSV/SSO import is configured per org after domain whitelist.
          </p>
        )}
      </DashboardPanel>
    </AdminFrame>
  )
}
