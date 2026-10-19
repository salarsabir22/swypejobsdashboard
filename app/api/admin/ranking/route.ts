import { NextResponse } from "next/server"
import { normalizeRankingWeights } from "@/lib/match/fit"
import { requireAdminApi, writeAudit } from "@/lib/admin/api-auth"

export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const auth = await requireAdminApi("matching")
    if ("error" in auth && auth.error) return auth.error

    const body = (await request.json().catch(() => null)) as {
      skills?: number
      location?: number
      recency?: number
      employer_tier?: number
    } | null

    const weights = normalizeRankingWeights(body)
    const { admin, user } = auth
    const { data, error } = await admin
      .from("ranking_weights")
      .upsert({ id: 1, ...weights, updated_at: new Date().toISOString() })
      .select("id, skills, location, recency, employer_tier")
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    await writeAudit(admin, user!.id, "ranking_weights", "ranking_weights", "1", weights)
    return NextResponse.json({ ok: true, weights: data })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save ranking weights."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
