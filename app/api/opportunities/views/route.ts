import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const runtime = "nodejs"

/**
 * Records that the signed-in student opened these international listings.
 * One row per (listing, student), so the CDC sees reach, not page loads.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false }, { status: 401 })

  const body = (await request.json().catch(() => null)) as { ids?: unknown } | null
  const ids = Array.isArray(body?.ids)
    ? [...new Set(body.ids.filter((id): id is string => typeof id === "string" && id.length > 0))].slice(0, 60)
    : []
  if (!ids.length) return NextResponse.json({ ok: true, recorded: 0 })

  const { error } = await supabase
    .from("international_opportunity_views")
    .upsert(
      ids.map((id) => ({ opportunity_id: id, student_id: user.id })),
      { onConflict: "opportunity_id,student_id", ignoreDuplicates: true }
    )

  // Before the migration lands the table is missing; browsing must still work.
  if (error) return NextResponse.json({ ok: false, recorded: 0, skipped: true })
  return NextResponse.json({ ok: true, recorded: ids.length })
}
