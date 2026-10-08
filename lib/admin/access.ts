import { cache } from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export type AdminStaffRole = "super_admin" | "moderator" | "support" | "analyst" | "finance" | "readonly"

export const requireAdmin = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login?next=/admin")
  const { data: profile } = await supabase.from("profiles").select("role, full_name").eq("id", user.id).maybeSingle()
  if (profile?.role !== "admin") redirect("/discover")
  const staffRes = await supabase.from("platform_staff").select("staff_role, modules").eq("user_id", user.id).maybeSingle()
  const staffRole = (!staffRes.error && (staffRes.data?.staff_role as AdminStaffRole)) || "super_admin"
  return {
    userId: user.id,
    name: profile.full_name,
    staffRole,
    modules: (!staffRes.error && staffRes.data?.modules) || ["all"],
  }
})

export async function writeAdminAudit(
  actorId: string,
  action: string,
  entity?: string,
  entityId?: string,
  meta?: Record<string, unknown>
) {
  const supabase = await createClient()
  await supabase.from("platform_audit_log").insert({
    actor_id: actorId,
    action,
    entity: entity || null,
    entity_id: entityId || null,
    meta: meta || null,
  })
}
