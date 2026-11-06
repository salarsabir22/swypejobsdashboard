import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { fetchAvailability, openInterviewSlots } from "@/lib/hiring/google-calendar"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 })

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
  if (profile?.role !== "recruiter") {
    return NextResponse.json({ error: "Recruiters only." }, { status: 403 })
  }

  const days = Math.min(14, Math.max(1, Number(new URL(request.url).searchParams.get("days") || 5)))
  const from = new Date()
  const to = new Date()
  to.setDate(to.getDate() + Math.max(days, 10))

  try {
    const availability = await fetchAvailability(user.id, from, to)
    if (!availability) {
      return NextResponse.json({ connected: false, busy: [], slots: [] })
    }
    return NextResponse.json({
      connected: true,
      email: availability.email,
      busy: availability.busy,
      slots: openInterviewSlots(availability.busy, days),
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not load availability." },
      { status: 500 }
    )
  }
}
