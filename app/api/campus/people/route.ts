import { NextResponse } from "next/server"
import { requireCampusCapabilityApi } from "@/lib/campus/staff-api"
import { writeCampusAudit } from "@/lib/campus/access"
import { directoryUniversity } from "@/lib/campus/directory"
import { setCampusPartnershipStatus } from "@/lib/campus/partnership"
import { sameCampus } from "@/lib/jobs/curation"

export const runtime = "nodejs"

type Action = "suspend" | "restore" | "graduate" | "message"

export async function POST(request: Request) {
  const staff = await requireCampusCapabilityApi("mutate")
  if ("error" in staff) return staff.error

  const body = (await request.json().catch(() => null)) as {
    action?: Action
    studentId?: string
    reason?: string
    message?: string
    title?: string
    graduationYear?: number | string
    program?: string
    notes?: string
  } | null

  const action = body?.action
  const studentId = body?.studentId?.trim()
  if (!action || !studentId || !["suspend", "restore", "graduate", "message"].includes(action)) {
    return NextResponse.json({ error: "action and studentId are required." }, { status: 400 })
  }

  const { data: student, error: studentErr } = await staff.admin
    .from("student_profiles")
    .select("id, university, degree, graduation_year, is_alumni")
    .eq("id", studentId)
    .maybeSingle()

  if (studentErr) return NextResponse.json({ error: studentErr.message }, { status: 400 })
  if (!student) return NextResponse.json({ error: "Student not found." }, { status: 404 })

  if (staff.university && student.university && !sameCampus(student.university, staff.university)) {
    return NextResponse.json({ error: "That student is not in your campus directory." }, { status: 403 })
  }

  const university = directoryUniversity(staff.university || student.university)

  if (action === "message") {
    const title = body?.title?.trim() || "Message from your career office"
    const message = body?.message?.trim()
    if (!message) return NextResponse.json({ error: "Message is required." }, { status: 400 })
    const { error } = await staff.admin.from("notifications").insert({
      user_id: studentId,
      type: "campus_message",
      title,
      body: message,
      data: { university, source: "campus_directory", actor_id: staff.user.id },
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    await writeCampusAudit(staff.user.id, "directory_message", "student", studentId, { university, title })
    return NextResponse.json({ ok: true })
  }

  if (action === "graduate") {
    const yearRaw = body?.graduationYear
    const graduationYear =
      typeof yearRaw === "number"
        ? yearRaw
        : yearRaw
          ? Number.parseInt(String(yearRaw), 10)
          : student.graduation_year
    if (!graduationYear || Number.isNaN(graduationYear)) {
      return NextResponse.json({ error: "Graduation year is required." }, { status: 400 })
    }
    const program = body?.program?.trim() || student.degree || null
    const notes = body?.notes?.trim() || null
    const payload: Record<string, unknown> = {
      is_alumni: true,
      still_enrolled: false,
      graduation_year: graduationYear,
      updated_at: new Date().toISOString(),
    }
    if (program) payload.degree = program
    let { error } = await staff.admin.from("student_profiles").update(payload).eq("id", studentId)
    if (error && /is_alumni|still_enrolled/i.test(error.message)) {
      delete payload.is_alumni
      delete payload.still_enrolled
      ;({ error } = await staff.admin.from("student_profiles").update(payload).eq("id", studentId))
    }
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    await writeCampusAudit(staff.user.id, "directory_graduate", "student", studentId, {
      university,
      graduationYear,
      program,
      notes,
    })
    return NextResponse.json({ ok: true })
  }

  if (action === "suspend" || action === "restore") {
    const reason = body?.reason?.trim() || null
    const message = body?.message?.trim() || null
    if (action === "suspend" && !reason) {
      return NextResponse.json({ error: "Choose a reason for disconnecting this student." }, { status: 400 })
    }

    try {
      await setCampusPartnershipStatus({
        university,
        subject: "student",
        userId: studentId,
        status: action === "suspend" ? "disconnected" : "active",
        reason,
        message,
        actorId: staff.user.id,
      })
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Could not update campus partnership." },
        { status: 400 }
      )
    }

    if (action === "suspend" && message) {
      await staff.admin.from("notifications").insert({
        user_id: studentId,
        type: "campus_account",
        title: "Career center access updated",
        body: message,
        data: {
          university,
          reason,
          source: "campus_directory",
          partnership: "disconnected",
        },
      })
    } else if (action === "restore") {
      await staff.admin.from("notifications").insert({
        user_id: studentId,
        type: "campus_account",
        title: "Career center access restored",
        body: message || "Your career office has restored your campus partnership on SwypeJobs.",
        data: {
          university,
          source: "campus_directory",
          partnership: "active",
        },
      })
    }

    await writeCampusAudit(staff.user.id, `directory_partnership_${action}`, "student", studentId, {
      university,
      reason,
      message,
      scope: "campus_partnership_only",
    })
    return NextResponse.json({
      ok: true,
      status: action === "suspend" ? "disconnected" : "active",
      scope: "campus_partnership_only",
    })
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 })
}
