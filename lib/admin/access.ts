import { cache } from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getRequestUser } from "@/lib/nav/app-shell-user"
import {
  canAccessModule,
  moduleForPath,
  normalizeModules,
  type AdminModule,
  type AdminStaffRole,
} from "@/lib/admin/modules"

export type { AdminStaffRole, AdminModule }

export const requireAdmin = cache(async () => {
  const { supabase, user } = await getRequestUser()
  if (!user) redirect("/login?next=/admin")

  const [profileRes, staffRes] = await Promise.all([
    supabase.from("profiles").select("role, full_name").eq("id", user.id).maybeSingle(),
    supabase.from("platform_staff").select("staff_role, modules").eq("user_id", user.id).maybeSingle(),
  ])

  const profile = profileRes.data
  if (profile?.role !== "admin") redirect("/discover")
  // Table missing → bootstrap as super_admin. Row missing → least privilege (moderator), not full access.
  const staffRole: AdminStaffRole = staffRes.error
    ? "super_admin"
    : (staffRes.data?.staff_role as AdminStaffRole) || "moderator"
  const modules = normalizeModules(
    staffRes.error ? ["all"] : (staffRes.data?.modules as string[] | null),
    staffRole,
  )
  return {
    userId: user.id,
    name: profile.full_name,
    staffRole,
    modules,
  }
})

export async function requireAdminModule(module: AdminModule) {
  const admin = await requireAdmin()
  if (!canAccessModule(admin.modules, module)) {
    redirect("/admin")
  }
  return admin
}

export async function requireAdminPath(pathname: string) {
  return requireAdminModule(moduleForPath(pathname))
}

export async function writeAdminAudit(
  actorId: string,
  action: string,
  entity?: string,
  entityId?: string,
  meta?: Record<string, unknown>,
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
