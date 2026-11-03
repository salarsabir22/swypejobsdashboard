import { NextResponse } from "next/server"
import { requireCampusCapabilityApi } from "@/lib/campus/staff-api"

export const runtime = "nodejs"

const KINDS = ["study_abroad", "exchange", "dual_degree", "scholarship"]

export async function POST(request: Request) {
  const staff = await requireCampusCapabilityApi("mutate")
  if ("error" in staff) return staff.error

  const body = (await request.json().catch(() => null)) as Record<string, string | undefined> | null
  const title = body?.title?.trim()
  const kind = body?.kind?.trim()
  if (!title || !kind || !KINDS.includes(kind)) {
    return NextResponse.json({ error: "Title and kind are required." }, { status: 400 })
  }
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
    created_by: staff.user.id,
  }
  if (staff.university) payload.university = staff.university
  let { error } = await staff.admin.from("international_opportunities").insert(payload)
  if (error && payload.university) {
    delete payload.university
    const retry = await staff.admin.from("international_opportunities").insert(payload)
    error = retry.error
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
