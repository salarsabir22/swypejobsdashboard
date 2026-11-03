import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { setSsoStatus } from "@/lib/sso/identity"
import { requireScimBearer, scimUserResource } from "@/lib/sso/scim-auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

async function loadIdentity(id: string) {
  const { data } = await createAdminClient()
    .from("sso_identities")
    .select("id, user_id, provider, subject, email, status, affiliation")
    .or(`id.eq.${id},user_id.eq.${id},subject.eq.${id}`)
    .limit(1)
    .maybeSingle()
  return data
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireScimBearer(request)
  if ("error" in auth) return auth.error
  const { id } = await params
  const row = await loadIdentity(id)
  if (!row) return NextResponse.json({ detail: "Not found" }, { status: 404 })
  return NextResponse.json(scimUserResource(row))
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireScimBearer(request)
  if ("error" in auth) return auth.error
  const { id } = await params
  const row = await loadIdentity(id)
  if (!row) return NextResponse.json({ detail: "Not found" }, { status: 404 })
  const body = (await request.json().catch(() => null)) as {
    active?: boolean
    Operations?: Array<{ op?: string; path?: string; value?: unknown }>
  } | null
  let active = body?.active
  for (const op of body?.Operations || []) {
    if (op.path?.toLowerCase() === "active") active = Boolean(op.value)
    if (op.op?.toLowerCase() === "replace" && typeof op.value === "object" && op.value && "active" in op.value) {
      active = Boolean((op.value as { active?: boolean }).active)
    }
  }
  if (active === false) await setSsoStatus(row.user_id, "deprovisioned")
  if (active === true) await setSsoStatus(row.user_id, "active")
  const next = await loadIdentity(id)
  return NextResponse.json(scimUserResource(next || { ...row, status: active === false ? "deprovisioned" : "active" }))
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = requireScimBearer(request)
  if ("error" in auth) return auth.error
  const { id } = await params
  const row = await loadIdentity(id)
  if (!row) return NextResponse.json({ detail: "Not found" }, { status: 404 })
  await setSsoStatus(row.user_id, "deprovisioned")
  return new NextResponse(null, { status: 204 })
}
