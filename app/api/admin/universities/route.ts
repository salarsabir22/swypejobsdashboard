import { NextResponse } from "next/server"
import { requireAdminApi, writeAudit } from "@/lib/admin/api-auth"

export const runtime = "nodejs"

type Action = "create" | "approve" | "suspend" | "set_domain" | "set_ferpa"

export async function POST(request: Request) {
  try {
    const auth = await requireAdminApi("universities")
    if ("error" in auth && auth.error) return auth.error

    const body = (await request.json().catch(() => null)) as {
      orgId?: string
      action?: Action
      name?: string
      domain?: string
      plan?: string
      ferpaSigned?: boolean
    } | null

    const action = body?.action
    if (!action || !["create", "approve", "suspend", "set_domain", "set_ferpa"].includes(action)) {
      return NextResponse.json({ error: "action is required." }, { status: 400 })
    }

    const { admin, user } = auth

    if (action === "create") {
      const name = body?.name?.trim()
      if (!name) return NextResponse.json({ error: "name required." }, { status: 400 })
      const domain = body?.domain?.trim().toLowerCase().replace(/^@/, "") || null
      if (domain && !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) {
        return NextResponse.json({ error: "Valid domain required (e.g. college.edu)." }, { status: 400 })
      }
      const { data, error } = await admin
        .from("university_orgs")
        .insert({
          name,
          domain,
          plan: body?.plan?.trim() || "pilot",
          status: "pending",
          ferpa_signed: Boolean(body?.ferpaSigned),
        })
        .select("id, name, status, domain, ferpa_signed, plan")
        .maybeSingle()
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      await writeAudit(admin, user!.id, "create", "university_org", data!.id, { name, domain })
      return NextResponse.json({ ok: true, org: data, action })
    }

    const orgId = body?.orgId?.trim()
    if (!orgId) return NextResponse.json({ error: "orgId required." }, { status: 400 })

    const patch: Record<string, unknown> = {}
    if (action === "approve") patch.status = "active"
    if (action === "suspend") patch.status = "suspended"
    if (action === "set_domain") {
      const domain = body?.domain?.trim().toLowerCase().replace(/^@/, "")
      if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) {
        return NextResponse.json({ error: "Valid domain required (e.g. college.edu)." }, { status: 400 })
      }
      patch.domain = domain
    }
    if (action === "set_ferpa") {
      if (typeof body?.ferpaSigned !== "boolean") {
        return NextResponse.json({ error: "ferpaSigned boolean required." }, { status: 400 })
      }
      patch.ferpa_signed = body.ferpaSigned
    }

    const { data: updated, error } = await admin
      .from("university_orgs")
      .update(patch)
      .eq("id", orgId)
      .select("id, name, status, domain, ferpa_signed, plan")
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    if (!updated) return NextResponse.json({ error: "University org not found." }, { status: 404 })

    await writeAudit(admin, user!.id, action, "university_org", orgId, patch)
    return NextResponse.json({ ok: true, org: updated, action })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update university."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
