import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import {
  APPOINTMENT_COLUMNS,
  appointmentKind,
  toAppointmentView,
  type AppointmentRecord,
} from "@/lib/campus/appointments"

export const runtime = "nodejs"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from("campus_appointments")
    .select(APPOINTMENT_COLUMNS)
    .eq("student_id", user.id)
    .order("starts_at", { ascending: true })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({
    appointments: ((data || []) as AppointmentRecord[]).map(toAppointmentView),
  })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 })

  const body = (await request.json().catch(() => null)) as { topic?: string; note?: string; starts_at?: string } | null
  if (!body?.topic?.trim() || !body.starts_at) {
    return NextResponse.json({ error: "Pick a topic and time." }, { status: 400 })
  }
  const startsAt = new Date(body.starts_at)
  if (Number.isNaN(startsAt.getTime())) {
    return NextResponse.json({ error: "Pick a valid time." }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: student } = await admin.from("student_profiles").select("university").eq("id", user.id).maybeSingle()
  const { error } = await admin.from("campus_appointments").insert({
    student_id: user.id,
    university: student?.university || "",
    kind: appointmentKind(body.topic, body.note),
    starts_at: startsAt.toISOString(),
    status: "booked",
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 })

  const body = (await request.json().catch(() => null)) as { id?: string; status?: string } | null
  if (!body?.id || body.status !== "cancelled") {
    return NextResponse.json({ error: "id is required." }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: existing } = await admin
    .from("campus_appointments")
    .select("id, student_id, status, advisor_id")
    .eq("id", body.id)
    .maybeSingle()
  if (!existing || existing.student_id !== user.id) {
    return NextResponse.json({ error: "Not found." }, { status: 404 })
  }
  if (existing.status !== "booked" || existing.advisor_id) {
    return NextResponse.json({ error: "This appointment can no longer be cancelled from here." }, { status: 400 })
  }
  const { error } = await admin.from("campus_appointments").update({ status: "cancelled" }).eq("id", body.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
