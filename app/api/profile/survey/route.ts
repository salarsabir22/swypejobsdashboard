import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { studentIsAlumni } from "@/lib/jobs/targeting"
import { EMPLOYMENT_STATUSES, RELATED_OPTIONS, isWorking } from "@/lib/profile/survey"
import { listCareerSurveysForStudent, upsertCareerSurvey, type CareerSurveyRow } from "@/lib/profile/career-survey-store"

export const runtime = "nodejs"

async function requireAlumni() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: "Sign in required." }, { status: 401 }) }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
  if (profile?.role !== "student") {
    return { error: NextResponse.json({ error: "Alumni surveys are for student accounts." }, { status: 403 }) }
  }

  let studentRes = await supabase
    .from("student_profiles")
    .select("still_enrolled, graduation_year, is_alumni")
    .eq("id", user.id)
    .maybeSingle()
  if (studentRes.error) {
    studentRes = await supabase.from("student_profiles").select("still_enrolled, graduation_year").eq("id", user.id).maybeSingle()
  }
  if (!studentIsAlumni(studentRes.data)) {
    return { error: NextResponse.json({ error: "Career surveys open after you graduate." }, { status: 403 }) }
  }

  return { user, admin: createAdminClient() }
}

export async function GET() {
  const auth = await requireAlumni()
  if ("error" in auth) return auth.error
  try {
    const rows = await listCareerSurveysForStudent(auth.admin, auth.user.id)
    return NextResponse.json({ rows })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load survey." }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const auth = await requireAlumni()
  if ("error" in auth) return auth.error

  const body = (await request.json().catch(() => null)) as Partial<CareerSurveyRow> | null
  const year = Number(body?.survey_year)
  const status = body?.employment_status
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return NextResponse.json({ error: "Pick a valid survey year." }, { status: 400 })
  }
  if (!status || !EMPLOYMENT_STATUSES.includes(status as (typeof EMPLOYMENT_STATUSES)[number])) {
    return NextResponse.json({ error: "Pick an employment status." }, { status: 400 })
  }
  if (isWorking(status) && !body?.employer?.trim()) {
    return NextResponse.json({ error: "Add your employer." }, { status: 400 })
  }
  if (status === "further_study" && !body?.further_study?.trim()) {
    return NextResponse.json({ error: "Add the program you’re studying." }, { status: 400 })
  }
  const related = body?.related_to_degree
  if (related && !RELATED_OPTIONS.includes(related as (typeof RELATED_OPTIONS)[number])) {
    return NextResponse.json({ error: "Related-to-degree must be yes, somewhat, or no." }, { status: 400 })
  }
  const salary = body?.salary_pkr == null ? null : Number(body.salary_pkr)
  if (salary !== null && (!Number.isFinite(salary) || salary < 0)) {
    return NextResponse.json({ error: "Salary should be a number in PKR." }, { status: 400 })
  }
  const satisfaction = body?.satisfaction == null ? null : Number(body.satisfaction)
  if (satisfaction !== null && (!Number.isInteger(satisfaction) || satisfaction < 1 || satisfaction > 5)) {
    return NextResponse.json({ error: "Satisfaction is 1–5." }, { status: 400 })
  }

  const payload: CareerSurveyRow = {
    student_id: auth.user.id,
    survey_year: year,
    employment_status: status,
    employer: isWorking(status) ? body?.employer?.trim() || null : null,
    designation: isWorking(status) ? body?.designation?.trim() || null : null,
    industry: isWorking(status) ? body?.industry?.trim() || null : null,
    salary_pkr: isWorking(status) ? salary : null,
    related_to_degree: isWorking(status) ? related || null : null,
    satisfaction,
    further_study: status === "further_study" ? body?.further_study?.trim() || null : null,
    comments: body?.comments?.trim() || null,
    submitted_at: new Date().toISOString(),
  }

  try {
    await upsertCareerSurvey(auth.admin, payload)
    return NextResponse.json({ row: payload })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save survey." }, { status: 500 })
  }
}
