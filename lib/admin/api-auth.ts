import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  canAccessModule,
  normalizeModules,
  type AdminModule,
  type AdminStaffRole,
} from "@/lib/admin/modules"

export async function requireAdminApi(module?: AdminModule) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: "Sign in required." }, { status: 401 }) }

  const [profileRes, staffRes] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    supabase.from("platform_staff").select("staff_role, modules").eq("user_id", user.id).maybeSingle(),
  ])

  if (profileRes.data?.role !== "admin") {
    return { error: NextResponse.json({ error: "Admin access required." }, { status: 403 }) }
  }

  const staffRole: AdminStaffRole = staffRes.error
    ? "super_admin"
    : (staffRes.data?.staff_role as AdminStaffRole) || "moderator"
  const modules = normalizeModules(
    staffRes.error ? ["all"] : (staffRes.data?.modules as string[] | null),
    staffRole,
  )

  if (module && !canAccessModule(modules, module)) {
    return { error: NextResponse.json({ error: "Module access denied." }, { status: 403 }) }
  }

  // Read-only staff cannot mutate even if a module is listed for viewing.
  if (module && staffRole === "readonly") {
    return { error: NextResponse.json({ error: "Read-only staff cannot mutate." }, { status: 403 }) }
  }

  return { user, admin: createAdminClient(), staffRole, modules }
}

export async function writeAudit(
  admin: ReturnType<typeof createAdminClient>,
  actorId: string,
  action: string,
  entity: string,
  entityId: string,
  meta?: Record<string, unknown>,
) {
  await admin.from("platform_audit_log").insert({
    actor_id: actorId,
    action,
    entity,
    entity_id: entityId,
    meta: meta || null,
  })
}
