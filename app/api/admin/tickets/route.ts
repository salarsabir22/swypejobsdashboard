import { NextResponse } from "next/server"
import { requireAdminApi, writeAudit } from "@/lib/admin/api-auth"

export const runtime = "nodejs"

const STATUSES = ["open", "pending", "resolved", "closed"] as const

export async function POST(request: Request) {
  try {
    const auth = await requireAdminApi("comms")
    if ("error" in auth && auth.error) return auth.error

    const body = (await request.json().catch(() => null)) as {
      ticketId?: string
      status?: (typeof STATUSES)[number]
    } | null

    const ticketId = body?.ticketId?.trim()
    const status = body?.status
    if (!ticketId || !status || !STATUSES.includes(status)) {
      return NextResponse.json({ error: "ticketId and status are required." }, { status: 400 })
    }

    const { admin, user } = auth
    const { data: updated, error } = await admin
      .from("support_tickets")
      .update({ status })
      .eq("id", ticketId)
      .select("id, subject, status, priority")
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    if (!updated) return NextResponse.json({ error: "Ticket not found." }, { status: 404 })

    await writeAudit(admin, user!.id, `ticket_${status}`, "support_ticket", ticketId, { status })
    return NextResponse.json({ ok: true, ticket: updated })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not update ticket."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
