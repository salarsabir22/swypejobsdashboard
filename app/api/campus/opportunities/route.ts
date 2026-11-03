import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const runtime = "nodejs"

const KINDS = ["study_abroad", "exchange", "dual_degree", "scholarship"]

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 })
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
  const { data: staff } = await supabase.from("campus_staff").select("university").eq("user_id", user.id).maybeSingle()
  if (profile?.role !== "admin" && profile?.role !== "university" && !staff?.university) {
    return NextResponse.json({ error: "Campus access required." }, { status: 403 })
  }

  const body = (await request.json().catch(() => null)) as Record<string, string | undefined> | null
  const title = body?.title?.trim()
  const kind = body?.kind?.trim()
  if (!title || !kind || !KINDS.includes(kind)) {
    return NextResponse.json({ error: "Title and kind are required." }, { status: 400 })
  }
  const admin = createAdminClient()
  const payload: Record<string, unknown> = {
    kind,
    title,
    country: body?.country?.trim() || null,
    organization: body?.organization?.trim() || null,
    summary: body?.summary?.trim() || null,
    eligibility: body?.eligibility?.trim() || null,
    visa_url: body?.visaUrl?.trim() || null,
    apply_url: body?.applyUrl?.trim() || null,
    deadline: body?.deadline?.trim() || null,
    created_by: user.id,
  }
  if (staff?.university) payload.university = staff.university
  let { error } = await admin.from("international_opportunities").insert(payload)
  if (error && payload.university) {
    delete payload.university
    const retry = await admin.from("international_opportunities").insert(payload)
    error = retry.error
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
