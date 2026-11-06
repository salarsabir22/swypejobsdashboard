import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createCalendarEvent } from "@/lib/hiring/google-calendar"
import { userCanUseGoogleCalendar } from "@/lib/hiring/calendar-access"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 })

  if (!(await userCanUseGoogleCalendar(supabase, user.id))) {
    return NextResponse.json({ error: "Calendar scheduling isn’t available for this account." }, { status: 403 })
  }

  const body = (await request.json().catch(() => null)) as {
    title?: string
    start?: string
    end?: string
    description?: string
    location?: string
    virtual?: boolean
    attendeeEmails?: string[]
  } | null

  if (!body?.title?.trim() || !body.start) {
    return NextResponse.json({ error: "Title and start time are required." }, { status: 400 })
  }

  try {
    const result = await createCalendarEvent({
      recruiterId: user.id,
      title: body.title.trim(),
      start: body.start,
      end: body.end,
      description: body.description,
      location: body.location,
      virtual: Boolean(body.virtual),
      attendeeEmails: Array.isArray(body.attendeeEmails) ? body.attendeeEmails : undefined,
    })
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not create calendar event." },
      { status: 500 }
    )
  }
}
