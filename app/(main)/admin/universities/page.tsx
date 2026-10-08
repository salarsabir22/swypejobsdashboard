import { requireAdmin } from "@/lib/admin/access"
import { createClient } from "@/lib/supabase/server"
import { AdminFrame } from "@/components/admin/AdminFrame"
import { DashboardPanel } from "@/components/dashboard/DashboardPanel"
import { countBy } from "@/lib/campus/helpers"
import { BreakdownList } from "@/components/campus/BreakdownList"

export default async function AdminUniversitiesPage() {
  const admin = await requireAdmin()
  const supabase = await createClient()
  const { data: orgs } = await supabase.from("university_orgs").select("*").order("created_at", { ascending: false })
  const { data: students } = await supabase.from("student_profiles").select("university")
  const { data: staff } = await supabase.from("campus_staff").select("university, staff_role, user_id")
  const bySchool = countBy((students || []).map((s) => s.university))

  return (
    <AdminFrame
      title="University management"
      description="Onboard campuses, whitelist domains, track FERPA agreements, and watch adoption health."
      staffRole={admin.staffRole}
    >
      <BreakdownList title="Students by listed university" rows={bySchool} />
      <DashboardPanel title="Contracts and branding">
        {(orgs || []).length ? (
          <ul className="space-y-2 text-[14px]">
            {orgs!.map((o) => (
              <li key={o.id}>
                {o.name} · {o.status} · {o.domain || "no domain"} · FERPA {o.ferpa_signed ? "signed" : "unsigned"} · {o.plan}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[14px] text-muted-foreground">
            Insert rows into university_orgs for contract, plan, renewal, branding JSON, and FERPA status. Career-office
            logins still use campus_staff.
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
          <p className="text-[14px] text-muted-foreground">No campus_staff rows yet. CSV/SSO import is configured per org after domain whitelist.</p>
        )}
      </DashboardPanel>
    </AdminFrame>
  )
}
