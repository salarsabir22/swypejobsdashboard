import { NextResponse } from "next/server"
import { requireCampusCapabilityApi } from "@/lib/campus/staff-api"
import {
  APPOINTMENT_COLUMNS,
  appointmentTopic,
  appointmentWriteStatus,
  toAppointmentView,
  type AppointmentRecord,
} from "@/lib/campus/appointments"

export const runtime = "nodejs"

const STATUSES = ["confirmed", "completed", "cancelled", "no_show"] as const

export async function GET() {
  const staff = await requireCampusCapabilityApi("view_advising")
  if ("error" in staff) return staff.error
  if (!staff.isAdmin && !staff.university) {
    return NextResponse.json({ error: "No campus is assigned to this account." }, { status: 403 })
  }

  let query = staff.admin.from("campus_appointments").select(APPOINTMENT_COLUMNS).order("starts_at", { ascending: true }).limit(200)
  if (staff.university) query = query.eq("university", staff.university)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const rows = (data || []) as AppointmentRecord[]
  const ids = [...new Set(rows.map((row) => row.student_id).filter(Boolean))] as string[]
  const { data: profiles } = ids.length ? await staff.admin.from("profiles").select("id, full_name").in("id", ids) : { data: [] }
  const names = new Map((profiles || []).map((p) => [p.id, p.full_name]))
  return NextResponse.json({
    appointments: rows.map((row) => ({
      ...toAppointmentView(row),
      student_name: names.get(row.student_id || "") || "Student",
    })),
  })
}

export async function PATCH(request: Request) {
  const staff = await requireCampusCapabilityApi("mutate")
  if ("error" in staff) return staff.error

  const body = (await request.json().catch(() => null)) as { id?: string; status?: string } | null
  if (!body?.id || !STATUSES.includes(body.status as (typeof STATUSES)[number])) {
    return NextResponse.json({ error: "id and status are required." }, { status: 400 })
  }
  const { data: existing } = await staff.admin
    .from("campus_appointments")
    .select(APPOINTMENT_COLUMNS)
    .eq("id", body.id)
    .maybeSingle()
  if (!existing) return NextResponse.json({ error: "Not found." }, { status: 404 })
  const row = existing as AppointmentRecord
  if (staff.university && row.university !== staff.university) {
    return NextResponse.json({ error: "Not found." }, { status: 404 })
  }
  const nextStatus = appointmentWriteStatus(body.status as (typeof STATUSES)[number])
  const { error } = await staff.admin
    .from("campus_appointments")
    .update({ status: nextStatus, advisor_id: staff.user.id })
    .eq("id", body.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (body.status === "confirmed") {
    await staff.admin.from("notifications").insert({
      user_id: row.student_id,
      type: "appointment",
      title: "Advising appointment confirmed",
      body: `${appointmentTopic(row.kind)} on ${row.starts_at ? new Date(row.starts_at).toLocaleString() : "the scheduled time"}`,
      data: { appointment_id: row.id },
    })
  }
  return NextResponse.json({ ok: true })
}
