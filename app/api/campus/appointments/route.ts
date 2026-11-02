import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  APPOINTMENT_COLUMNS,
  appointmentTopic,
  appointmentWriteStatus,
  toAppointmentView,
  type AppointmentRecord,
} from "@/lib/campus/appointments"

export const runtime = "nodejs"

const STATUSES = ["confirmed", "completed", "cancelled", "no_show"] as const

async function staffUniversity(userId: string) {
  const supabase = await createClient()
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle()
  if (profile?.role === "admin") return { role: "admin" as const, university: null }
  const { data: staff } = await supabase.from("campus_staff").select("university").eq("user_id", userId).maybeSingle()
  if (profile?.role === "university" || staff?.university) {
    return { role: "university" as const, university: staff?.university || null }
  }
  return null
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 })
  const access = await staffUniversity(user.id)
  if (!access) return NextResponse.json({ error: "Campus access required." }, { status: 403 })
  if (access.role === "university" && !access.university) {
    return NextResponse.json({ error: "No campus is assigned to this account." }, { status: 403 })
  }

  const admin = createAdminClient()
  let query = admin.from("campus_appointments").select(APPOINTMENT_COLUMNS).order("starts_at", { ascending: true }).limit(200)
  if (access.university) query = query.eq("university", access.university)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const rows = (data || []) as AppointmentRecord[]
  const ids = [...new Set(rows.map((row) => row.student_id).filter(Boolean))] as string[]
  const { data: profiles } = ids.length ? await admin.from("profiles").select("id, full_name").in("id", ids) : { data: [] }
  const names = new Map((profiles || []).map((p) => [p.id, p.full_name]))
  return NextResponse.json({
    appointments: rows.map((row) => ({
      ...toAppointmentView(row),
      student_name: names.get(row.student_id || "") || "Student",
    })),
  })
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 })
  const access = await staffUniversity(user.id)
  if (!access) return NextResponse.json({ error: "Campus access required." }, { status: 403 })

  const body = (await request.json().catch(() => null)) as { id?: string; status?: string } | null
  if (!body?.id || !STATUSES.includes(body.status as (typeof STATUSES)[number])) {
    return NextResponse.json({ error: "id and status are required." }, { status: 400 })
  }
  const admin = createAdminClient()
  const { data: existing } = await admin
    .from("campus_appointments")
    .select(APPOINTMENT_COLUMNS)
    .eq("id", body.id)
    .maybeSingle()
  if (!existing) return NextResponse.json({ error: "Not found." }, { status: 404 })
  const row = existing as AppointmentRecord
  if (access.university && row.university !== access.university) {
    return NextResponse.json({ error: "Not found." }, { status: 404 })
  }
  const nextStatus = appointmentWriteStatus(body.status as (typeof STATUSES)[number])
  const { error } = await admin
    .from("campus_appointments")
    .update({ status: nextStatus, advisor_id: user.id })
    .eq("id", body.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (body.status === "confirmed") {
    await admin.from("notifications").insert({
      user_id: row.student_id,
      type: "appointment",
      title: "Advising appointment confirmed",
      body: `${appointmentTopic(row.kind)} on ${row.starts_at ? new Date(row.starts_at).toLocaleString() : "the scheduled time"}`,
      data: { appointment_id: row.id },
    })
  }
  return NextResponse.json({ ok: true })
}
