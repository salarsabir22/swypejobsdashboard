import { NextResponse } from "next/server"
import { requireCampusCapabilityApi } from "@/lib/campus/staff-api"
import { writeCampusAudit } from "@/lib/campus/access"
import { directoryUniversity } from "@/lib/campus/directory"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const staff = await requireCampusCapabilityApi("mutate")
  if ("error" in staff) return staff.error

  const body = (await request.json().catch(() => null)) as {
    university?: string
    title?: string
    message?: string
    segment?: string
    studentIds?: string[]
  } | null

  const title = body?.title?.trim()
  const message = body?.message?.trim()
  const studentIds = Array.isArray(body?.studentIds)
    ? [...new Set(body.studentIds.filter((id): id is string => typeof id === "string" && Boolean(id.trim())))]
    : []
  const university = directoryUniversity(body?.university || staff.university || "")

  if (!title || !message) {
    return NextResponse.json({ error: "Title and message are required." }, { status: 400 })
  }
  if (!university && !staff.isAdmin) {
    return NextResponse.json({ error: "Campus not set." }, { status: 403 })
  }
  if (!studentIds.length) {
    return NextResponse.json({ error: "No students in this segment." }, { status: 400 })
  }

  const ids = studentIds.slice(0, 80)
  const rows = ids.map((userId) => ({
    user_id: userId,
    type: "campus_nudge",
    title,
    body: message,
    data: { university, source: "career_office", actor_id: staff.user.id },
  }))

  const { error } = await staff.admin.from("notifications").insert(rows)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await staff.admin.from("campus_nudges").insert({
    university,
    created_by: staff.user.id,
    segment: body?.segment?.trim() || title,
    title,
    body: message,
  })

  await writeCampusAudit(staff.user.id, "campus_nudge", "campus", university || "all", {
    count: rows.length,
    title,
  })

  return NextResponse.json({ ok: true, sent: rows.length })
}
