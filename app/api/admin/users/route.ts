import { NextResponse } from "next/server"
import { requireAdminApi, writeAudit } from "@/lib/admin/api-auth"

export const runtime = "nodejs"

type Status = "warned" | "suspended" | "banned" | "active"

export async function POST(request: Request) {
  try {
    const auth = await requireAdminApi("users")
    if ("error" in auth && auth.error) return auth.error

    const body = (await request.json().catch(() => null)) as {
      userId?: string
      status?: Status
    } | null

    const userId = body?.userId?.trim()
    const status = body?.status
    if (!userId || !status || !["warned", "suspended", "banned", "active"].includes(status)) {
      return NextResponse.json({ error: "userId and status are required." }, { status: 400 })
    }

    const { admin, user } = auth
    const { data: updated, error } = await admin
      .from("user_moderation")
      .upsert({
        user_id: userId,
        status,
        updated_at: new Date().toISOString(),
        updated_by: user!.id,
      })
      .select("user_id, status")
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    await writeAudit(admin, user!.id, `user_${status}`, "user", userId)

    return NextResponse.json({
      ok: true,
      userId,
      status: updated?.status || status,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update user."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
