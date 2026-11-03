import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { canCampus, type CampusCapability } from "@/lib/campus/rbac"
import type { CampusAccess, CampusStaffRole } from "@/lib/campus/types"

export async function requireCampusStaff() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: "Sign in required." }, { status: 401 }) }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
  const { data: staff } = await supabase.from("campus_staff").select("university, staff_role").eq("user_id", user.id).maybeSingle()
  const isAdmin = profile?.role === "admin"
  if (!isAdmin && !staff?.university) {
    return { error: NextResponse.json({ error: "Campus access required." }, { status: 403 }) }
  }

  const access: CampusAccess = {
    userId: user.id,
    role: isAdmin ? "admin" : "university",
    staffRole: isAdmin ? "admin" : ((staff?.staff_role as CampusStaffRole) || "faculty"),
    university: staff?.university || null,
    universities: staff?.university ? [staff.university] : [],
  }

  return {
    user,
    university: staff?.university || null,
    staffRole: access.staffRole,
    isAdmin,
    admin: createAdminClient(),
    access,
  }
}

export async function requireCampusCapabilityApi(capability: CampusCapability) {
  const staff = await requireCampusStaff()
  if ("error" in staff) return staff
  if (!canCampus(staff.access, capability)) {
    return { error: NextResponse.json({ error: "You don’t have access to this campus action." }, { status: 403 }) }
  }
  return staff
}

export async function requireCampusSsoAdmin() {
  return requireCampusCapabilityApi("view_sso")
}
