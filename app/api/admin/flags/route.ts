import { NextResponse } from "next/server"
import { requireAdminApi, writeAudit } from "@/lib/admin/api-auth"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const auth = await requireAdminApi("matching")
    if ("error" in auth && auth.error) return auth.error

    const body = (await request.json().catch(() => null)) as {
      key?: string
      enabled?: boolean
      rollout?: number
    } | null

    const key = body?.key?.trim()
    if (!key || typeof body?.enabled !== "boolean") {
      return NextResponse.json({ error: "key and enabled are required." }, { status: 400 })
    }

    const patch: Record<string, unknown> = { enabled: body.enabled }
    if (typeof body.rollout === "number" && Number.isFinite(body.rollout)) {
      patch.rollout = Math.max(0, Math.min(100, Math.round(body.rollout)))
    }

    const { admin, user } = auth
    const { data, error } = await admin
      .from("feature_flags")
      .update(patch)
      .eq("key", key)
      .select("key, enabled, rollout")
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    if (!data) return NextResponse.json({ error: "Flag not found." }, { status: 404 })

    await writeAudit(admin, user!.id, body.enabled ? "flag_on" : "flag_off", "feature_flag", key, patch)
    return NextResponse.json({ ok: true, flag: data })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update flag."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
