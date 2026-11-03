import { NextResponse } from "next/server"

export function requireScimBearer(request: Request) {
  const token = process.env.IOBM_SCIM_TOKEN?.trim()
  if (!token) {
    return { error: NextResponse.json({ detail: "SCIM is not configured. Set IOBM_SCIM_TOKEN." }, { status: 503 }) }
  }
  const header = request.headers.get("authorization") || ""
  const given = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : ""
  if (!given || given !== token) {
    return { error: NextResponse.json({ schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"], detail: "Unauthorized", status: "401" }, { status: 401 }) }
  }
  return { ok: true as const }
}

export function scimUserResource(row: {
  id: string
  user_id: string
  email: string | null
  subject: string
  status: string
  affiliation: string | null
}) {
  return {
    schemas: ["urn:ietf:params:scim:schemas:core:2.0:User"],
    id: row.id,
    externalId: row.subject,
    userName: row.email,
    active: row.status === "active",
    emails: row.email ? [{ value: row.email, primary: true }] : [],
    "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User": {
      department: row.affiliation || undefined,
    },
    meta: { resourceType: "User" },
  }
}
