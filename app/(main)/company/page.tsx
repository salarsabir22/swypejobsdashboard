import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { isCompanySchemaMissing } from "@/lib/companies"
import { CompanyWorkspace, type CompanyInvite, type CompanyMember, type CompanyProfile } from "@/components/company/CompanyWorkspace"

type MemberRow = {
  user_id: string
  role: "owner" | "recruiter"
  hiring_area?: string | null
  profiles: { full_name: string | null } | { full_name: string | null }[] | null
}

export default async function CompanyWorkspacePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
  if (profile?.role !== "recruiter") redirect("/discover")

  const accepted = await supabase.rpc("accept_company_invite")
  const schemaReady = !isCompanySchemaMissing(accepted.error)

  const membership = schemaReady
    ? await supabase.from("company_members").select("company_id, role").eq("user_id", user.id).maybeSingle()
    : { data: null }

  let company: CompanyProfile | null = null
  let defaults: CompanyProfile | null = null
  let members: CompanyMember[] = []
  let invites: CompanyInvite[] = []
  const role = (membership.data?.role as "owner" | "recruiter" | undefined) || null

  if (membership.data?.company_id) {
    const [{ data: companyRow }, { data: memberRows }, inviteResult] = await Promise.all([
      supabase
        .from("companies")
        .select("id, name, description, website_url, industry, employee_count, hiring_focus")
        .eq("id", membership.data.company_id)
        .maybeSingle(),
      supabase
        .from("company_members")
        .select("user_id, role, hiring_area, profiles(full_name)")
        .eq("company_id", membership.data.company_id)
        .order("created_at", { ascending: true }),
      role === "owner"
        ? supabase.from("company_invites").select("email, full_name, hiring_area").eq("company_id", membership.data.company_id)
        : Promise.resolve({ data: [] as CompanyInvite[] }),
    ])
    company = (companyRow as CompanyProfile | null) || null
    members = ((memberRows || []) as MemberRow[]).map((row) => {
      const person = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
      return {
        user_id: row.user_id,
        role: row.role,
        full_name: person?.full_name || null,
        hiring_area: row.hiring_area || null,
      }
    })
    invites = (inviteResult.data || []) as CompanyInvite[]
  } else if (schemaReady) {
    const { data: existing } = await supabase
      .from("recruiter_profiles")
      .select("company_name, description, website_url, industry, employee_count, hiring_focus")
      .eq("id", user.id)
      .maybeSingle()
    if (existing?.company_name) {
      defaults = {
        id: "",
        name: existing.company_name,
        description: existing.description,
        website_url: existing.website_url,
        industry: existing.industry,
        employee_count: existing.employee_count,
        hiring_focus: existing.hiring_focus,
      }
    }
  }

  return (
    <CompanyWorkspace
      role={role}
      company={company}
      defaults={defaults}
      members={members}
      invites={invites}
      schemaReady={schemaReady}
    />
  )
}
