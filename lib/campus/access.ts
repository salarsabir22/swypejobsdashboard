import { cache } from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import type { CampusAccess, CampusStaffRole } from "@/lib/campus/types"

export const getCampusAccess = cache(async (): Promise<CampusAccess> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login?next=/campus")

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
    .select("university, staff_role")
    .eq("user_id", user.id)
    .maybeSingle()
  const staff = staffRes.error ? null : staffRes.data

  if (role === "university" || staff?.university) {
    const university = staff?.university || "__unassigned__"
    return {
      userId: user.id,
      role: "university",
      staffRole: (staff?.staff_role as CampusStaffRole) || "advisor",
      university,
      universities: staff?.university ? [staff.university] : [],
    }
  }

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
