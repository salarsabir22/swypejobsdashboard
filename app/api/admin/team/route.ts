import { NextResponse } from "next/server"
import { DEFAULT_MODULES_BY_ROLE, type AdminStaffRole } from "@/lib/admin/modules"
import { requireAdminApi, writeAudit } from "@/lib/admin/api-auth"

export const runtime = "nodejs"

const ROLES: AdminStaffRole[] = ["super_admin", "moderator", "support", "analyst", "finance", "readonly"]

export async function POST(request: Request) {
  try {
    const auth = await requireAdminApi("team")
    if ("error" in auth && auth.error) return auth.error

    const body = (await request.json().catch(() => null)) as {
      action?: "invite" | "set_role"
      email?: string
      userId?: string
      staffRole?: AdminStaffRole
      modules?: string[]
    } | null

    const action = body?.action
    const { admin, user, staffRole: actorRole } = auth

    if (action === "invite") {
      const email = body?.email?.trim().toLowerCase()
      const staffRole = (body?.staffRole || "moderator") as AdminStaffRole
      if (!email || !ROLES.includes(staffRole)) {
        return NextResponse.json({ error: "email and valid staffRole required." }, { status: 400 })
      }
      if (staffRole === "super_admin" && actorRole !== "super_admin") {
        return NextResponse.json({ error: "Only super admins can grant super_admin." }, { status: 403 })
      }
      const modules = body?.modules?.length ? body.modules : DEFAULT_MODULES_BY_ROLE[staffRole]

      const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
        data: { role: "admin", staff_role: staffRole },
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/login`,
      })
      if (inviteError) {
        // Fall back: promote existing user by email lookup
        const { data: listed } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
        const existing = listed?.users?.find((u) => u.email?.toLowerCase() === email)
        if (!existing) {
          return NextResponse.json({ error: inviteError.message }, { status: 400 })
        }
        await admin.from("profiles").update({ role: "admin" }).eq("id", existing.id)
        const { error: staffErr } = await admin.from("platform_staff").upsert(
          { user_id: existing.id, staff_role: staffRole, modules },
          { onConflict: "user_id" },
        )
        if (staffErr) return NextResponse.json({ error: staffErr.message }, { status: 400 })
        await writeAudit(admin, user!.id, "invite_promote", "platform_staff", existing.id, { email, staffRole, modules })
        return NextResponse.json({ ok: true, userId: existing.id, promoted: true })
      }

      const newId = invited.user?.id
      if (!newId) return NextResponse.json({ error: "Invite created but no user id." }, { status: 500 })

      await admin.from("profiles").upsert({ id: newId, role: "admin", full_name: email.split("@")[0] })
      const { error: staffErr } = await admin.from("platform_staff").upsert(
        { user_id: newId, staff_role: staffRole, modules },
        { onConflict: "user_id" },
      )
      if (staffErr) return NextResponse.json({ error: staffErr.message }, { status: 400 })

      await writeAudit(admin, user!.id, "invite", "platform_staff", newId, { email, staffRole, modules })
      return NextResponse.json({ ok: true, userId: newId, invited: true })
    }

    if (action === "set_role") {
      const userId = body?.userId?.trim()
      const staffRole = body?.staffRole as AdminStaffRole
      if (!userId || !staffRole || !ROLES.includes(staffRole)) {
        return NextResponse.json({ error: "userId and valid staffRole required." }, { status: 400 })
      }
      if (staffRole === "super_admin" && actorRole !== "super_admin") {
        return NextResponse.json({ error: "Only super admins can grant super_admin." }, { status: 403 })
      }
      if (userId === user!.id && staffRole !== "super_admin") {
        return NextResponse.json({ error: "Cannot demote yourself." }, { status: 400 })
      }
      const modules = body?.modules?.length ? body.modules : DEFAULT_MODULES_BY_ROLE[staffRole]
      const { error } = await admin.from("platform_staff").upsert(
        { user_id: userId, staff_role: staffRole, modules },
        { onConflict: "user_id" },
      )
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      await admin.from("profiles").update({ role: "admin" }).eq("id", userId)
      await writeAudit(admin, user!.id, "set_role", "platform_staff", userId, { staffRole, modules })
      return NextResponse.json({ ok: true, userId, staffRole, modules })
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update team."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
