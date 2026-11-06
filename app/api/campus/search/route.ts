import { NextResponse } from "next/server"
import { requireCampusCapabilityApi } from "@/lib/campus/staff-api"
import { canCampus } from "@/lib/campus/rbac"
import { studentIsAlumni } from "@/lib/jobs/targeting"
import { sameCampus } from "@/lib/jobs/curation"

export const runtime = "nodejs"

function hit(id: string, href: string, title: string, subtitle?: string | null) {
  return { id, href, title, subtitle: subtitle || null }
}

export async function GET(request: Request) {
  const staff = await requireCampusCapabilityApi("view_home")
  if ("error" in staff) return staff.error

  const q = new URL(request.url).searchParams.get("q")?.trim() || ""
  if (q.length < 2) {
    return NextResponse.json({ jobs: [], students: [], alumni: [], employers: [] })
  }

  const university = staff.university
  const like = `%${q.replace(/%/g, "")}%`
  const canLookupPeople = canCampus(staff.access, "view_advising") || canCampus(staff.access, "view_actions")

  const peopleSelect =
    "id, degree, graduation_year, still_enrolled, university, profiles(full_name)"
  const peopleQuery = !canLookupPeople
    ? Promise.resolve({ data: [] as never[] })
    : university
      ? staff.admin.from("student_profiles").select(peopleSelect).eq("university", university).limit(80)
      : staff.admin.from("student_profiles").select(peopleSelect).limit(80)
  const [jobsRes, studentsRes, recruitersRes] = await Promise.all([
    staff.admin.from("jobs").select("id, title, recruiter_profiles(company_name), target_universities, distribution_scope").ilike("title", like).eq("is_active", true).limit(8),
    peopleQuery,
    staff.admin.from("recruiter_profiles").select("id, company_name, industry").ilike("company_name", like).limit(8),
  ])

  const jobs = (jobsRes.data || [])
    .filter((job) => {
      if (!university) return true
      const targets = Array.isArray(job.target_universities) ? job.target_universities : []
      if (job.distribution_scope === "partner_universities" || targets.length) {
        return targets.some((name) => sameCampus(String(name), university))
      }
      return true
    })
    .slice(0, 8)
    .map((job) => {
      const company = Array.isArray(job.recruiter_profiles) ? job.recruiter_profiles[0] : job.recruiter_profiles
      return hit(job.id, `/campus/jobs#${job.id}`, job.title, company?.company_name)
    })

  const needle = q.toLowerCase()
  const people = (studentsRes.data || []).filter((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
    const name = profile?.full_name || ""
    return name.toLowerCase().includes(needle) || (row.degree || "").toLowerCase().includes(needle)
  })

  const students = people
    .filter((row) => !studentIsAlumni(row))
    .slice(0, 8)
    .map((row) => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
      return hit(row.id, `/candidates/${row.id}`, profile?.full_name || "Student", row.degree)
    })
  const alumni = people
    .filter((row) => studentIsAlumni(row))
    .slice(0, 8)
    .map((row) => {
      const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
      return hit(row.id, `/candidates/${row.id}`, profile?.full_name || "Alumni", row.degree)
    })

  const employers = (recruitersRes.data || []).map((row) =>
    hit(row.id, "/campus/employers", row.company_name || "Employer", row.industry)
  )

  return NextResponse.json({ jobs, students, alumni, employers })
}
