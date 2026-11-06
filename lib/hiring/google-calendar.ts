import { createAdminClient } from "@/lib/supabase/admin"

export const GOOGLE_CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ")

export type CalendarBusy = { start: string; end: string }
export type CalendarEvent = { id: string; title: string; start: string; end: string; allDay?: boolean }

type ConnectionRow = {
  recruiter_id: string
  provider: string
  account_email: string | null
  access_token: string
  refresh_token: string | null
  token_expires_at: string | null
  calendar_id: string
}

function clientId() {
  return process.env.GOOGLE_CALENDAR_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || ""
}

function clientSecret() {
  return process.env.GOOGLE_CALENDAR_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || ""
}

export function googleCalendarConfigured() {
  return Boolean(clientId() && clientSecret())
}

export function calendarRedirectUri(origin: string) {
  return `${origin.replace(/\/$/, "")}/api/calendar/google/callback`
}

export function googleAuthUrl(opts: { origin: string; state: string }) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth")
  url.searchParams.set("client_id", clientId())
  url.searchParams.set("redirect_uri", calendarRedirectUri(opts.origin))
  url.searchParams.set("response_type", "code")
  url.searchParams.set("scope", GOOGLE_CALENDAR_SCOPES)
  url.searchParams.set("access_type", "offline")
  url.searchParams.set("prompt", "consent")
  url.searchParams.set("include_granted_scopes", "true")
  url.searchParams.set("state", opts.state)
  return url.toString()
}

async function tokenRequest(body: Record<string, string>) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
  })
  const json = (await res.json()) as {
    access_token?: string
    refresh_token?: string
    expires_in?: number
    error?: string
    error_description?: string
  }
  if (!res.ok || !json.access_token) {
    throw new Error(json.error_description || json.error || "Google token exchange failed.")
  }
  return json
}

export async function exchangeGoogleCode(opts: { code: string; origin: string }) {
  return tokenRequest({
    code: opts.code,
    client_id: clientId(),
    client_secret: clientSecret(),
    redirect_uri: calendarRedirectUri(opts.origin),
    grant_type: "authorization_code",
  })
}

async function refreshGoogleToken(refreshToken: string) {
  return tokenRequest({
    refresh_token: refreshToken,
    client_id: clientId(),
    client_secret: clientSecret(),
    grant_type: "refresh_token",
  })
}

export async function googleUserEmail(accessToken: string) {
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const json = (await res.json()) as { email?: string }
  return json.email || null
}

function admin() {
  return createAdminClient()
}

export async function saveGoogleConnection(opts: {
  recruiterId: string
  accessToken: string
  refreshToken?: string | null
  expiresIn?: number
  email?: string | null
}) {
  const expires = opts.expiresIn ? new Date(Date.now() + opts.expiresIn * 1000).toISOString() : null
  const existing = await getConnection(opts.recruiterId)
  const payload = {
    recruiter_id: opts.recruiterId,
    provider: "google",
    account_email: opts.email || existing?.account_email || null,
    access_token: opts.accessToken,
    refresh_token: opts.refreshToken || existing?.refresh_token || null,
    token_expires_at: expires,
    calendar_id: existing?.calendar_id || "primary",
    updated_at: new Date().toISOString(),
    connected_at: existing?.connected_at || new Date().toISOString(),
  }
  const { error } = await admin().from("recruiter_calendar_connections").upsert(payload, { onConflict: "recruiter_id" })
  if (error) throw new Error(error.message)
}

async function getConnection(recruiterId: string) {
  const { data, error } = await admin()
    .from("recruiter_calendar_connections")
    .select("recruiter_id, provider, account_email, access_token, refresh_token, token_expires_at, calendar_id, connected_at")
    .eq("recruiter_id", recruiterId)
    .maybeSingle()
  if (error) {
    if (/recruiter_calendar_connections|schema cache/i.test(error.message)) {
      throw new Error("Calendar storage isn’t set up. Run supabase/migrations/20261106_recruiter_calendar.sql in the Supabase SQL editor.")
    }
    throw new Error(error.message)
  }
  return data as (ConnectionRow & { connected_at?: string }) | null
}

export async function deleteGoogleConnection(recruiterId: string) {
  const { error } = await admin().from("recruiter_calendar_connections").delete().eq("recruiter_id", recruiterId)
  if (error && !/recruiter_calendar_connections|schema cache/i.test(error.message)) throw new Error(error.message)
}

export async function connectionStatus(recruiterId: string) {
  const row = await getConnection(recruiterId)
  if (!row) return { connected: false as const, email: null as string | null }
  return { connected: true as const, email: row.account_email }
}

async function accessTokenFor(recruiterId: string) {
  const row = await getConnection(recruiterId)
  if (!row) return null
  const expires = row.token_expires_at ? new Date(row.token_expires_at).getTime() : 0
  if (expires - 60_000 > Date.now()) return { token: row.access_token, calendarId: row.calendar_id || "primary", email: row.account_email }
  if (!row.refresh_token) return { token: row.access_token, calendarId: row.calendar_id || "primary", email: row.account_email }
  const refreshed = await refreshGoogleToken(row.refresh_token)
  await saveGoogleConnection({
    recruiterId,
    accessToken: refreshed.access_token!,
    refreshToken: refreshed.refresh_token || row.refresh_token,
    expiresIn: refreshed.expires_in,
    email: row.account_email,
  })
  return { token: refreshed.access_token!, calendarId: row.calendar_id || "primary", email: row.account_email }
}

export async function fetchAvailability(recruiterId: string, from: Date, to: Date) {
  const auth = await accessTokenFor(recruiterId)
  if (!auth) return null
  const body = {
    timeMin: from.toISOString(),
    timeMax: to.toISOString(),
    items: [{ id: auth.calendarId || "primary" }],
  }
  const res = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
    method: "POST",
    headers: { Authorization: `Bearer ${auth.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const json = (await res.json()) as {
    error?: { message?: string }
    calendars?: Record<string, { busy?: { start: string; end: string }[] }>
  }
  if (!res.ok) throw new Error(json.error?.message || "Could not read Google Calendar availability.")
  const calendar = json.calendars?.[auth.calendarId] || json.calendars?.primary || Object.values(json.calendars || {})[0]
  const busy: CalendarBusy[] = (calendar?.busy || []).map((b) => ({ start: b.start, end: b.end }))
  return { email: auth.email, busy }
}

export async function fetchUpcomingEvents(recruiterId: string, from: Date, to: Date) {
  const auth = await accessTokenFor(recruiterId)
  if (!auth) return null
  const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(auth.calendarId || "primary")}/events`)
  url.searchParams.set("timeMin", from.toISOString())
  url.searchParams.set("timeMax", to.toISOString())
  url.searchParams.set("singleEvents", "true")
  url.searchParams.set("orderBy", "startTime")
  url.searchParams.set("maxResults", "40")
  const res = await fetch(url, { headers: { Authorization: `Bearer ${auth.token}` } })
  const json = (await res.json()) as {
    error?: { message?: string }
    items?: Array<{ id?: string; summary?: string; start?: { dateTime?: string; date?: string }; end?: { dateTime?: string; date?: string } }>
  }
  if (!res.ok) throw new Error(json.error?.message || "Could not list Google Calendar events.")
  const events: CalendarEvent[] = (json.items || []).map((item) => ({
    id: item.id || "",
    title: item.summary || "Busy",
    start: item.start?.dateTime || item.start?.date || "",
    end: item.end?.dateTime || item.end?.date || "",
    allDay: Boolean(item.start?.date && !item.start?.dateTime),
  }))
  return { email: auth.email, events }
}

export async function createCalendarEvent(opts: {
  recruiterId: string
  title: string
  start: string
  end?: string
  description?: string
  location?: string
  /** When true, ask Google to attach a Meet conference link. */
  virtual?: boolean
  attendeeEmails?: string[]
}) {
  const auth = await accessTokenFor(opts.recruiterId)
  if (!auth) return { created: false as const, htmlLink: null as string | null, hangoutLink: null as string | null }
  const start = new Date(opts.start)
  if (Number.isNaN(start.getTime())) return { created: false as const, htmlLink: null, hangoutLink: null }
  const end = opts.end ? new Date(opts.end) : new Date(start.getTime() + 30 * 60 * 1000)
  const attendees = (opts.attendeeEmails || [])
    .map((email) => email.trim())
    .filter(Boolean)
    .map((email) => ({ email }))

  const payload: Record<string, unknown> = {
    summary: opts.title,
    description: opts.description || undefined,
    location: opts.location || undefined,
    start: { dateTime: start.toISOString() },
    end: { dateTime: end.toISOString() },
  }
  if (attendees.length) payload.attendees = attendees
  if (opts.virtual) {
    payload.conferenceData = {
      createRequest: {
        requestId: crypto.randomUUID(),
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    }
  }

  const url = new URL(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(auth.calendarId || "primary")}/events`
  )
  if (opts.virtual) url.searchParams.set("conferenceDataVersion", "1")
  if (attendees.length) url.searchParams.set("sendUpdates", "all")

  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${auth.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const json = (await res.json().catch(() => null)) as {
    error?: { message?: string }
    htmlLink?: string
    hangoutLink?: string
    conferenceData?: { entryPoints?: Array<{ entryPointType?: string; uri?: string }> }
  } | null
  if (!res.ok) {
    throw new Error(json?.error?.message || "Could not add the interview to Google Calendar.")
  }
  const meetFromEntry = json?.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri
  return {
    created: true as const,
    htmlLink: json?.htmlLink || null,
    hangoutLink: json?.hangoutLink || meetFromEntry || null,
  }
}

export function openInterviewSlots(busy: CalendarBusy[], days = 5, slotMinutes = 30) {
  const workStart = 9
  const workEnd = 17
  const now = new Date()
  const slots: { start: string; end: string; label: string }[] = []
  const busyMs = busy.map((b) => ({ start: new Date(b.start).getTime(), end: new Date(b.end).getTime() }))

  for (let day = 0; day < 14 && slots.length < days * 6; day++) {
    const cursor = new Date(now)
    cursor.setDate(now.getDate() + day)
    cursor.setHours(workStart, 0, 0, 0)
    if (cursor.getDay() === 0 || cursor.getDay() === 6) continue
    const endOfDay = new Date(cursor)
    endOfDay.setHours(workEnd, 0, 0, 0)
    while (cursor.getTime() + slotMinutes * 60_000 <= endOfDay.getTime()) {
      const start = cursor.getTime()
      const end = start + slotMinutes * 60_000
      cursor.setMinutes(cursor.getMinutes() + slotMinutes)
      if (end <= Date.now()) continue
      const overlaps = busyMs.some((b) => start < b.end && end > b.start)
      if (overlaps) continue
      const startDate = new Date(start)
      slots.push({
        start: startDate.toISOString(),
        end: new Date(end).toISOString(),
        label: startDate.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }),
      })
    }
  }
  return slots.slice(0, 18)
}
