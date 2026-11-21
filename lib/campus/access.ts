import { cache } from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import type { CampusAccess, CampusStaffRole } from "@/lib/campus/types"

export async function readCampusAccess(): Promise<CampusAccess | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
  const role = profile?.role

  if (role === "admin") {
    return {
      userId: user.id,
      role: "admin",
      staffRole: "admin",
      university: null,
      universities: [],
    }
  }

  const staffRes = await supabase
    .from("campus_staff")
    .select("university, staff_role, access_grants")
    .eq("user_id", user.id)
    .maybeSingle()
  let staff = staffRes.error ? null : staffRes.data
  // `access_grants` may not have been migrated yet — fall back to the role default.
  if (staffRes.error) {
    const retry = await supabase
      .from("campus_staff")
      .select("university, staff_role")
      .eq("user_id", user.id)
      .maybeSingle()
    staff = retry.error ? null : (retry.data as typeof staff)
  }

  if (staff?.university) {
    return {
      userId: user.id,
      role: "university",
      staffRole: (staff.staff_role as CampusStaffRole) || "faculty",
      university: staff.university,
      universities: [staff.university],
      grants: (staff as { access_grants?: string[] | null }).access_grants ?? null,
    }
  }

  return null
}

export const getCampusAccess = cache(async (): Promise<CampusAccess> => {
  const access = await readCampusAccess()
  if (access) return access
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login?next=/campus")
  redirect("/discover")
})

export async function writeCampusAudit(
  actorId: string,
  action: string,
  entity?: string,
  entityId?: string,
  meta?: Record<string, unknown>
) {
  const supabase = await createClient()
  const { error } = await supabase.from("campus_audit_log").insert({
    actor_id: actorId,
    action,
    entity: entity || null,
    entity_id: entityId || null,
    meta: meta || null,
  })
  if (error) return
}
