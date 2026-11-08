import { NextResponse } from "next/server"
import { requireCampusCapabilityApi } from "@/lib/campus/staff-api"
import { writeCampusAudit } from "@/lib/campus/access"
import { directoryUniversity } from "@/lib/campus/directory"
import { setCampusPartnershipStatus } from "@/lib/campus/partnership"

export const runtime = "nodejs"

type Action = "suspend" | "restore" | "message"

export async function POST(request: Request) {
  const staff = await requireCampusCapabilityApi("mutate")
  if ("error" in staff) return staff.error

  const body = (await request.json().catch(() => null)) as {
    action?: Action
    employerId?: string
    reason?: string
    message?: string
    title?: string
  } | null

  const action = body?.action
  const employerId = body?.employerId?.trim()
  if (!action || !employerId || !["suspend", "restore", "message"].includes(action)) {
    return NextResponse.json({ error: "action and employerId are required." }, { status: 400 })
  }
  if (employerId.startsWith("partner:")) {
    return NextResponse.json({ error: "This partner has no employer account yet." }, { status: 400 })
  }

  const university = directoryUniversity(staff.university)
  if (!university && !staff.isAdmin) {
    return NextResponse.json({ error: "Campus not set." }, { status: 403 })
  }
  const campus = university || ""

  const { data: partner } = await staff.admin
    .from("campus_employer_partners")
    .select("id, university, recruiter_id, company_name, notes, tier")
    .eq("recruiter_id", employerId)
    .eq("university", campus)
    .maybeSingle()

  if (!partner && staff.university) {
    return NextResponse.json({ error: "That employer is not in your campus directory." }, { status: 403 })
  }

  const { data: recruiter } = await staff.admin
    .from("recruiter_profiles")
    .select("id, company_name")
    .eq("id", employerId)
    .maybeSingle()
  if (!recruiter) return NextResponse.json({ error: "Employer not found." }, { status: 404 })

  if (action === "message") {
    const title = body?.title?.trim() || "Message from your career office"
    const message = body?.message?.trim()
    if (!message) return NextResponse.json({ error: "Message is required." }, { status: 400 })
    const { error } = await staff.admin.from("notifications").insert({
      user_id: employerId,
      type: "campus_message",
      title,
      body: message,
      data: { university: campus, source: "campus_employer_directory", actor_id: staff.user.id },
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    await writeCampusAudit(staff.user.id, "directory_message", "employer", employerId, {
      university: campus,
      title,
    })
    return NextResponse.json({ ok: true })
  }

  if (action === "suspend" || action === "restore") {
    const reason = body?.reason?.trim() || null
    const message = body?.message?.trim() || null
    if (action === "suspend" && !reason) {
      return NextResponse.json({ error: "Choose a reason for ending this campus partnership." }, { status: 400 })
    }

    try {
      await setCampusPartnershipStatus({
        university: campus,
        subject: "employer",
        userId: employerId,
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
        user_id: employerId,
        type: "campus_account",
        title: "Campus partnership updated",
        body: message,
        data: {
          university: campus,
          reason,
          source: "campus_employer_directory",
          partnership: "disconnected",
        },
      })
    } else if (action === "restore") {
      await staff.admin.from("notifications").insert({
        user_id: employerId,
        type: "campus_account",
        title: "Campus partnership restored",
        body:
          message ||
          `Your partnership with ${campus} has been restored. You can target this campus again when posting jobs.`,
        data: {
          university: campus,
          source: "campus_employer_directory",
          partnership: "active",
        },
      })
    }

    await writeCampusAudit(staff.user.id, `directory_partnership_${action}`, "employer", employerId, {
      university: campus,
      reason,
      message,
      company: recruiter.company_name,
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
