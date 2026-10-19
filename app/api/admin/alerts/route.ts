import { NextResponse } from "next/server"
import { requireAdminApi, writeAudit } from "@/lib/admin/api-auth"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const auth = await requireAdminApi("alerts")
    if ("error" in auth && auth.error) return auth.error

    const body = (await request.json().catch(() => null)) as {
      action?: "toggle_rule" | "create_rule" | "update_rule"
      ruleId?: string
      isActive?: boolean
      name?: string
      trigger?: string
      ruleAction?: string
    } | null

    const { admin, user } = auth
    const action = body?.action

    if (action === "create_rule") {
      const name = body?.name?.trim()
      const trigger = body?.trigger?.trim()
      const ruleAction = body?.ruleAction?.trim()
      if (!name || !trigger || !ruleAction) {
        return NextResponse.json({ error: "name, trigger, and ruleAction required." }, { status: 400 })
      }
      const { data, error } = await admin
        .from("automation_rules")
        .insert({ name, trigger, action: ruleAction, is_active: true })
        .select("id, name, trigger, action, is_active")
        .maybeSingle()
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      await writeAudit(admin, user!.id, "rule_create", "automation_rule", data!.id, { name, trigger, ruleAction })
      return NextResponse.json({ ok: true, rule: data })
    }

    if (action === "update_rule") {
      const ruleId = body?.ruleId?.trim()
      if (!ruleId) return NextResponse.json({ error: "ruleId required." }, { status: 400 })
      const patch: Record<string, unknown> = {}
      if (body?.name?.trim()) patch.name = body.name.trim()
      if (body?.trigger?.trim()) patch.trigger = body.trigger.trim()
      if (body?.ruleAction?.trim()) patch.action = body.ruleAction.trim()
      if (!Object.keys(patch).length) {
        return NextResponse.json({ error: "Nothing to update." }, { status: 400 })
      }
      const { data, error } = await admin
        .from("automation_rules")
        .update(patch)
        .eq("id", ruleId)
        .select("id, name, trigger, action, is_active")
        .maybeSingle()
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      if (!data) return NextResponse.json({ error: "Rule not found." }, { status: 404 })
      await writeAudit(admin, user!.id, "rule_update", "automation_rule", ruleId, patch)
      return NextResponse.json({ ok: true, rule: data })
    }

    if (action === "toggle_rule") {
      const ruleId = body?.ruleId?.trim()
      const isActive = body?.isActive
      if (!ruleId || typeof isActive !== "boolean") {
        return NextResponse.json({ error: "ruleId and isActive required." }, { status: 400 })
      }
      const { data, error } = await admin
        .from("automation_rules")
        .update({ is_active: isActive })
        .eq("id", ruleId)
        .select("id, name, trigger, action, is_active")
        .maybeSingle()
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      if (!data) return NextResponse.json({ error: "Rule not found." }, { status: 404 })
      await writeAudit(admin, user!.id, isActive ? "rule_on" : "rule_off", "automation_rule", ruleId)
      return NextResponse.json({ ok: true, rule: data })
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update alert rule."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
