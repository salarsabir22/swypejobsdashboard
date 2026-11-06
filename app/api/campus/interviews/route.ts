import { NextResponse } from "next/server"
import { requireCampusCapabilityApi } from "@/lib/campus/staff-api"
import { sameCampus } from "@/lib/jobs/curation"
import { interviewFormatFromNote, interviewFormatLabel } from "@/lib/hiring/interview-invite"

export const runtime = "nodejs"

type ProposalRow = {
  id: string
  match_id: string
  proposed_at: string
  location_or_link: string | null
  note: string | null
  status: string
}

type MatchRow = {
  id: string
  student_id: string
  job_id: string | null
  recruiter_id: string | null
}

function dayBounds(isoDay?: string | null) {
  const base = isoDay ? new Date(`${isoDay}T12:00:00`) : new Date()
  if (Number.isNaN(base.getTime())) {
    const now = new Date()
    const start = new Date(now)
    start.setHours(0, 0, 0, 0)
    const end = new Date(now)
    end.setHours(23, 59, 59, 999)
    return { start, end, label: now.toISOString().slice(0, 10) }
  }
  const start = new Date(base)
  start.setHours(0, 0, 0, 0)
  const end = new Date(base)
  end.setHours(23, 59, 59, 999)
  return { start, end, label: start.toISOString().slice(0, 10) }
}

export async function GET(request: Request) {
  const staff = await requireCampusCapabilityApi("view_advising")
  if ("error" in staff) return staff.error
  if (!staff.isAdmin && !staff.university) {
    return NextResponse.json({ error: "No campus is assigned to this account." }, { status: 403 })
  }

  const url = new URL(request.url)
  const { start, end, label } = dayBounds(url.searchParams.get("day"))
  const university = staff.university

  // Prefer exact match for the assigned campus, then fall back to a broader scan so
  // alternate university spellings (e.g. IoBM) still resolve via sameCampus.
  let studentRows: Array<{ id: string; university: string | null }> = []
  if (university) {
    const exact = await staff.admin.from("student_profiles").select("id, university").eq("university", university).limit(5000)
    if (exact.error) return NextResponse.json({ error: exact.error.message }, { status: 500 })
    studentRows = (exact.data || []) as Array<{ id: string; university: string | null }>
    if (!studentRows.length) {
      const broad = await staff.admin.from("student_profiles").select("id, university").not("university", "is", null).limit(5000)
      if (broad.error) return NextResponse.json({ error: broad.error.message }, { status: 500 })
      studentRows = (broad.data || []) as Array<{ id: string; university: string | null }>
    }
  } else {
    const all = await staff.admin.from("student_profiles").select("id, university").not("university", "is", null).limit(5000)
    if (all.error) return NextResponse.json({ error: all.error.message }, { status: 500 })
    studentRows = (all.data || []) as Array<{ id: string; university: string | null }>
  }

  const campusStudents = studentRows.filter((row) =>
    university ? sameCampus(row.university, university) : Boolean(row.university)
  )
  const studentIds = campusStudents.map((row) => row.id)
  if (!studentIds.length) {
    return NextResponse.json({ day: label, interviews: [] })
  }

  const { data: matchRows, error: matchError } = await staff.admin
    .from("matches")
    .select("id, student_id, job_id, recruiter_id")
    .in("student_id", studentIds)
    .limit(4000)
  if (matchError) return NextResponse.json({ error: matchError.message }, { status: 500 })

  const matches = (matchRows || []) as MatchRow[]
  const matchIds = matches.map((row) => row.id)
  if (!matchIds.length) {
    return NextResponse.json({ day: label, interviews: [] })
  }

  const { data: proposalRows, error: proposalError } = await staff.admin
    .from("interview_proposals")
    .select("id, match_id, proposed_at, location_or_link, note, status")
    .in("match_id", matchIds)
    .gte("proposed_at", start.toISOString())
    .lte("proposed_at", end.toISOString())
    .in("status", ["pending", "accepted"])
    .order("proposed_at", { ascending: true })
    .limit(500)
  if (proposalError) return NextResponse.json({ error: proposalError.message }, { status: 500 })

  const proposals = (proposalRows || []) as ProposalRow[]
  if (!proposals.length) {
    return NextResponse.json({ day: label, interviews: [] })
  }

  const matchById = new Map(matches.map((row) => [row.id, row]))
  const profileIds = [
    ...new Set(
      proposals.flatMap((proposal) => {
        const match = matchById.get(proposal.match_id)
        return match ? [match.student_id, match.recruiter_id].filter(Boolean) : []
      }) as string[]
    ),
  ]
  const jobIds = [
    ...new Set(proposals.map((proposal) => matchById.get(proposal.match_id)?.job_id).filter(Boolean) as string[]),
  ]

  const [{ data: profiles }, { data: jobs }, { data: recruiters }] = await Promise.all([
    profileIds.length
      ? staff.admin.from("profiles").select("id, full_name").in("id", profileIds)
      : Promise.resolve({ data: [] as Array<{ id: string; full_name: string | null }> }),
    jobIds.length
      ? staff.admin.from("jobs").select("id, title, company").in("id", jobIds)
      : Promise.resolve({ data: [] as Array<{ id: string; title: string | null; company: string | null }> }),
    profileIds.length
      ? staff.admin.from("recruiter_profiles").select("id, company_name").in("id", profileIds)
      : Promise.resolve({ data: [] as Array<{ id: string; company_name: string | null }> }),
  ])

  const names = new Map((profiles || []).map((row) => [row.id, row.full_name || ""]))
  const jobById = new Map((jobs || []).map((row) => [row.id, row]))
  const companyByRecruiter = new Map((recruiters || []).map((row) => [row.id, row.company_name || ""]))
  const universityByStudent = new Map(campusStudents.map((row) => [row.id, row.university || ""]))

  const interviews = proposals.map((proposal) => {
    const match = matchById.get(proposal.match_id)
    const job = match?.job_id ? jobById.get(match.job_id) : null
    const format = interviewFormatFromNote(proposal.note)
    return {
      id: proposal.id,
      proposed_at: proposal.proposed_at,
      status: proposal.status,
      format,
      format_label: interviewFormatLabel(format),
      location_or_link: proposal.location_or_link,
      note: proposal.note,
      student_id: match?.student_id || null,
      student_name: names.get(match?.student_id || "") || "Student",
      university: universityByStudent.get(match?.student_id || "") || university || "",
      job_title: job?.title || "Role",
      company: job?.company || companyByRecruiter.get(match?.recruiter_id || "") || "Employer",
      recruiter_name: names.get(match?.recruiter_id || "") || "Recruiter",
    }
  })

  return NextResponse.json({ day: label, interviews })
}
