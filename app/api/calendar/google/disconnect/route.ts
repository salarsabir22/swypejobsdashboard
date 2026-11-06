import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { deleteGoogleConnection } from "@/lib/hiring/google-calendar"
import { userCanUseGoogleCalendar } from "@/lib/hiring/calendar-access"

export const runtime = "nodejs"

export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 })

  if (!(await userCanUseGoogleCalendar(supabase, user.id))) {
    return NextResponse.json({ error: "Calendar disconnect isn’t available for this account." }, { status: 403 })
  }

  try {
    await deleteGoogleConnection(user.id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not disconnect Google Calendar." },
      { status: 500 }
    )
  }
}
