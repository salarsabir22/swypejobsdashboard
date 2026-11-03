import { NextResponse } from "next/server"
import {
  applyCampusPortal,
  listCampusIdentities,
  resolveSsoSubject,
  setSsoStatus,
  upsertSsoIdentity,
  type SsoAffiliation,
} from "@/lib/sso/identity"
import { requireScimBearer, scimUserResource } from "@/lib/sso/scim-auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function affiliationFrom(body: Record<string, unknown>): SsoAffiliation {
  const enterprise = body["urn:ietf:params:scim:schemas:extension:enterprise:2.0:User"] as { department?: string } | undefined
  const department = enterprise?.department?.toLowerCase()
  if (department === "faculty" || department === "alumni" || department === "student") return department
  return "student"
}

export async function GET(request: Request) {
  const auth = requireScimBearer(request)
  if ("error" in auth) return auth.error
  const listed = await listCampusIdentities()
  const resources = listed.rows.map((row) =>
    scimUserResource({
      id: row.id,
      user_id: row.user_id,
      email: row.email,
      subject: row.subject,
      status: row.status,
      affiliation: row.affiliation,
    })
  )
  return NextResponse.json({
    schemas: ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
    totalResults: resources.length,
    itemsPerPage: resources.length,
    startIndex: 1,
    Resources: resources,
  })
}

export async function POST(request: Request) {
  const auth = requireScimBearer(request)
  if ("error" in auth) return auth.error
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return NextResponse.json({ detail: "JSON body required." }, { status: 400 })
  const email = String(
    body.userName ||
      (Array.isArray(body.emails) ? (body.emails[0] as { value?: string } | undefined)?.value : "") ||
      ""
  )
    .trim()
    .toLowerCase()
  const subject = String(body.externalId || email)
  const name = body.name as { formatted?: string } | undefined
  if (!email) return NextResponse.json({ detail: "userName (email) is required." }, { status: 400 })

  const resolved = await resolveSsoSubject({
    provider: "iobm_saml",
    subject,
    email,
    fullName: name?.formatted,
  })
  if (!resolved.ok) return NextResponse.json({ detail: resolved.message }, { status: 409 })

  const affiliation = affiliationFrom(body)
  const portal = affiliation === "faculty" ? "faculty" : affiliation === "alumni" ? "alumni" : "student"
  await applyCampusPortal({ userId: resolved.userId, portal, fullName: name?.formatted })
  if (body.active === false) await setSsoStatus(resolved.userId, "deprovisioned")
  else {
    await upsertSsoIdentity({
      userId: resolved.userId,
      provider: "iobm_saml",
      subject,
      email,
      affiliation,
      status: "active",
    })
  }

  const listed = await listCampusIdentities()
  const row = listed.rows.find((item) => item.user_id === resolved.userId) || {
    id: resolved.userId,
    user_id: resolved.userId,
    email,
    subject,
    status: body.active === false ? "deprovisioned" : "active",
    affiliation,
  }
  return NextResponse.json(scimUserResource(row), { status: 201 })
}
