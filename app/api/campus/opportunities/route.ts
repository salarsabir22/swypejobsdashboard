import { NextResponse } from "next/server"
import { requireCampusCapabilityApi } from "@/lib/campus/staff-api"
import { isOpportunityKind } from "@/lib/campus/opportunities"
import { sameCampus } from "@/lib/jobs/curation"

export const runtime = "nodejs"

type OpportunityBody = Record<string, string | boolean | undefined | null>

function textField(body: OpportunityBody, camel: string, snake: string) {
  if (!(camel in body) && !(snake in body)) return undefined
  const raw = (camel in body ? body[camel] : body[snake]) as string | null | undefined
  return typeof raw === "string" ? raw.trim() || null : null
}

export async function POST(request: Request) {
  // International programs are their own switch, so a staff member limited to
  // that permission can still publish listings.
  const staff = await requireCampusCapabilityApi("view_international")
  if ("error" in staff) return staff.error

  const body = (await request.json().catch(() => null)) as OpportunityBody | null
  const title = typeof body?.title === "string" ? body.title.trim() : ""
  const kind = typeof body?.kind === "string" ? body.kind.trim() : ""
  if (!title || !isOpportunityKind(kind)) {
    return NextResponse.json({ error: "Title and kind are required." }, { status: 400 })
  }
  const payload: Record<string, unknown> = {
    kind,
    title,
    country: textField(body || {}, "country", "country") ?? null,
    organization: textField(body || {}, "organization", "organization") ?? null,
    summary: textField(body || {}, "summary", "summary") ?? null,
    eligibility: textField(body || {}, "eligibility", "eligibility") ?? null,
    visa_url: textField(body || {}, "visaUrl", "visa_url") ?? null,
    apply_url: textField(body || {}, "applyUrl", "apply_url") ?? null,
    deadline: textField(body || {}, "deadline", "deadline") ?? null,
    is_active: true,
    created_by: staff.user.id,
  }
  if (staff.university) payload.university = staff.university
  let { error } = await staff.admin.from("international_opportunities").insert(payload)
  if (error && payload.university) {
    delete payload.university
    const retry = await staff.admin.from("international_opportunities").insert(payload)
    error = retry.error
  }
  if (error && /is_active|updated_at/i.test(error.message)) {
    delete payload.is_active
    const retry = await staff.admin.from("international_opportunities").insert(payload)
    error = retry.error
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

/** Edit a listing after it is live, or hide / re-publish it. */
export async function PATCH(request: Request) {
  const staff = await requireCampusCapabilityApi("view_international")
  if ("error" in staff) return staff.error

  const body = (await request.json().catch(() => null)) as OpportunityBody | null
  const id = typeof body?.id === "string" ? body.id.trim() : ""
  if (!id) return NextResponse.json({ error: "Listing id is required." }, { status: 400 })

  const { data: existing, error: readError } = await staff.admin
    .from("international_opportunities")
    .select("id, university")
    .eq("id", id)
    .maybeSingle()
  if (readError) return NextResponse.json({ error: readError.message }, { status: 500 })
  if (!existing) return NextResponse.json({ error: "That listing no longer exists." }, { status: 404 })

  const rowUniversity = (existing as { university?: string | null }).university || null
  if (
    staff.access.role !== "admin" &&
    staff.university &&
    rowUniversity &&
    !sameCampus(rowUniversity, staff.university)
  ) {
    return NextResponse.json({ error: "That listing belongs to another campus." }, { status: 403 })
  }

  const patch: Record<string, unknown> = {}
  if (typeof body?.kind === "string") {
    const kind = body.kind.trim()
    if (!isOpportunityKind(kind)) return NextResponse.json({ error: "Unknown listing kind." }, { status: 400 })
    patch.kind = kind
  }
  if (typeof body?.title === "string") {
    const title = body.title.trim()
    if (!title) return NextResponse.json({ error: "Title can’t be empty." }, { status: 400 })
    patch.title = title
  }
  const fields: [string, string][] = [
    ["country", "country"],
    ["organization", "organization"],
    ["summary", "summary"],
    ["eligibility", "eligibility"],
    ["visaUrl", "visa_url"],
    ["applyUrl", "apply_url"],
    ["deadline", "deadline"],
  ]
  for (const [camel, snake] of fields) {
    const value = textField(body || {}, camel, snake)
    if (value !== undefined) patch[snake] = value
  }
  if (typeof body?.isActive === "boolean") patch.is_active = body.isActive
  if (!Object.keys(patch).length) {
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 })
  }

  // updated_at is optional so the edit still saves before the migration lands.
  let { error } = await staff.admin
    .from("international_opportunities")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
  if (error && /updated_at/i.test(error.message)) {
    const retry = await staff.admin.from("international_opportunities").update(patch).eq("id", id)
    error = retry.error
  }
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
