import { NextResponse } from "next/server"
import { requireCampusSsoAdmin } from "@/lib/campus/staff-api"
import { writeCampusAudit } from "@/lib/campus/access"
import {
  listCampusIdentities,
  listOpenConflicts,
  mergeSsoAccounts,
  overrideSsoRole,
  setSsoStatus,
  syncRoster,
  type SsoAffiliation,
} from "@/lib/sso/identity"
import { isIobmPortal } from "@/lib/sso/iobm"

export const runtime = "nodejs"

export async function GET() {
  const staff = await requireCampusSsoAdmin()
  if ("error" in staff) return staff.error
  const [identities, conflicts] = await Promise.all([listCampusIdentities(), listOpenConflicts()])
  return NextResponse.json({
    identities: identities.rows,
    conflicts: conflicts.rows,
    missingTable: identities.missingTable || conflicts.missingTable,
  })
}

export async function POST(request: Request) {
  const staff = await requireCampusSsoAdmin()
  if ("error" in staff) return staff.error
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body?.action) return NextResponse.json({ error: "action is required." }, { status: 400 })

  try {
    if (body.action === "deprovision" && typeof body.userId === "string") {
      await setSsoStatus(body.userId, "deprovisioned")
      await writeCampusAudit(staff.user.id, "sso_deprovision", "user", body.userId)
      return NextResponse.json({ ok: true })
    }
    if (body.action === "restore" && typeof body.userId === "string") {
      await setSsoStatus(body.userId, "active")
      await writeCampusAudit(staff.user.id, "sso_restore", "user", body.userId)
      return NextResponse.json({ ok: true })
    }
    if (body.action === "override" && typeof body.userId === "string") {
      const portal = String(body.portal)
      if (!isIobmPortal(portal)) return NextResponse.json({ error: "portal is required." }, { status: 400 })
      const role = await overrideSsoRole({
        userId: body.userId,
        portal,
        staffRole: typeof body.staffRole === "string" ? body.staffRole : undefined,
        actorId: staff.user.id,
        conflictId: typeof body.conflictId === "string" ? body.conflictId : undefined,
        note: typeof body.note === "string" ? body.note : undefined,
      })
      await writeCampusAudit(staff.user.id, "sso_override", "user", body.userId, { portal: body.portal, role })
      return NextResponse.json({ ok: true, role })
    }
    if (body.action === "merge" && typeof body.keepUserId === "string" && typeof body.absorbUserId === "string") {
      const mergePortal = String(body.portal || "")
      await mergeSsoAccounts({
        keepUserId: body.keepUserId,
        absorbUserId: body.absorbUserId,
        actorId: staff.user.id,
        conflictId: typeof body.conflictId === "string" ? body.conflictId : undefined,
        portal: isIobmPortal(mergePortal) ? mergePortal : undefined,
        staffRole: typeof body.staffRole === "string" ? body.staffRole : undefined,
      })
      await writeCampusAudit(staff.user.id, "sso_merge", "user", body.keepUserId, { absorb: body.absorbUserId })
      return NextResponse.json({ ok: true })
    }
    if (body.action === "roster" && Array.isArray(body.entries)) {
      const result = await syncRoster(
        body.entries as Array<{ email?: string; subject?: string; affiliation?: SsoAffiliation | "departed"; active?: boolean }>,
        { strict: body.strict === true }
      )
      await writeCampusAudit(staff.user.id, "sso_roster", "sso_identities", "iobm", result)
      return NextResponse.json({ ok: true, ...result })
    }
    return NextResponse.json({ error: "Unknown action." }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "SSO update failed." }, { status: 400 })
  }
}
