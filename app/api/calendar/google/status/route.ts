import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { connectionStatus, googleCalendarConfigured } from "@/lib/hiring/google-calendar"
import { userCanUseGoogleCalendar } from "@/lib/hiring/calendar-access"

export const runtime = "nodejs"

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 })

  if (!(await userCanUseGoogleCalendar(supabase, user.id))) {
    return NextResponse.json({ error: "Calendar connect isn’t available for this account." }, { status: 403 })
  }

  try {
    const status = await connectionStatus(user.id)
    return NextResponse.json({
      configured: googleCalendarConfigured(),
      connected: status.connected,
      email: status.email,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not load calendar status."
    return NextResponse.json({
      configured: googleCalendarConfigured(),
      connected: false,
      email: null,
      error: message,
    })
  }
}
