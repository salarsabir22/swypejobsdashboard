import { NextResponse } from "next/server"
import { requireCampusStaff } from "@/lib/campus/staff-api"
import { writeCampusAudit } from "@/lib/campus/access"
import {
  canManageStaffAccess,
  isKnownPermission,
  isProtectedStaffRole,
} from "@/lib/campus/staff-permissions"

export const runtime = "nodejs"

/**
 * Toggle the CDC access switches for one staff member.
 *
 * `permissions: null` clears the override so the staff-role default applies.
 * Only the CDC Super Admin (director) or a platform admin may call this, and the
 * director seat itself can never be restricted.
 */
export async function PATCH(request: Request) {
  const staff = await requireCampusStaff()
  if ("error" in staff) return staff.error

  if (!canManageStaffAccess(staff.access)) {
    return NextResponse.json(
      { error: "Only the CDC Super Admin can change staff access." },
      { status: 403 }
    )
  }

  const body = (await request.json().catch(() => null)) as
    | { userId?: string; permissions?: string[] | null }
    | null
  const userId = body?.userId?.trim()
  if (!userId) return NextResponse.json({ error: "Pick a staff member." }, { status: 400 })

  const permissions = body?.permissions
  if (permissions !== null && permissions !== undefined && !Array.isArray(permissions)) {
    return NextResponse.json({ error: "Permissions must be a list." }, { status: 400 })
  }
  const requested = permissions ?? null
  const unknown = (requested || []).filter((id) => !isKnownPermission(id))
  if (unknown.length) {
    return NextResponse.json({ error: `Unknown permission: ${unknown.join(", ")}` }, { status: 400 })
  }

  const { data: target, error: targetError } = await staff.admin
    .from("campus_staff")
    .select("user_id, university, staff_role")
    .eq("user_id", userId)
    .maybeSingle()
  if (targetError) return NextResponse.json({ error: targetError.message }, { status: 500 })
  if (!target) return NextResponse.json({ error: "That staff member isn’t on a campus roster." }, { status: 404 })

  if (staff.access.role !== "admin" && target.university !== staff.access.university) {
    return NextResponse.json({ error: "That staff member belongs to another campus." }, { status: 403 })
  }
  if (isProtectedStaffRole(target.staff_role)) {
    return NextResponse.json(
      { error: "The CDC director seat keeps full access and can’t be restricted." },
      { status: 400 }
    )
  }

  const grants = requested ? [...new Set(requested)] : null
  const { error } = await staff.admin.from("campus_staff").update({ access_grants: grants }).eq("user_id", userId)
  if (error) {
    if (/access_grants|schema cache/i.test(error.message)) {
      return NextResponse.json(
        {
          error:
            "Access switches aren’t set up in this database yet. Run supabase/migrations/20261121130000_campus_feedback_fixes.sql, then try again.",
        },
        { status: 500 }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await writeCampusAudit(staff.user.id, "campus_staff.access_updated", "campus_staff", userId, {
    permissions: grants,
  })

  return NextResponse.json({ ok: true, permissions: grants })
}
