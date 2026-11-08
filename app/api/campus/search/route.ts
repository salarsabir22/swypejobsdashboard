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
  const like = `%${q.replace(/[%_]/g, "")}%`
  const canLookupPeople = canCampus(staff.access, "view_advising") || canCampus(staff.access, "view_actions")

  const peoplePromise = !canLookupPeople
    ? Promise.resolve({ students: [] as ReturnType<typeof hit>[], alumni: [] as ReturnType<typeof hit>[] })
    : (async () => {
        // `is_alumni` is optional in some DBs — never select it; studentIsAlumni uses still_enrolled/year.
        const nameQuery = staff.admin.from("profiles").select("id, full_name").ilike("full_name", like).limit(40)
        let idQuery = staff.admin.from("student_profiles").select("id").ilike("campus_student_id", like).limit(40)
        if (university) idQuery = idQuery.eq("university", university)
        const [{ data: nameHits }, { data: idHits }] = await Promise.all([nameQuery, idQuery])
        const ids = [...new Set([...(nameHits || []).map((row) => row.id), ...(idHits || []).map((row) => row.id)].filter(Boolean))]
        if (!ids.length) return { students: [], alumni: [] }

        const { data: people, error: peopleError } = await staff.admin
          .from("student_profiles")
          .select("id, degree, graduation_year, still_enrolled, university")
          .in("id", ids)
          .limit(40)
        if (peopleError) {
          console.error("[campus/search] people query failed", peopleError.message)
          return { students: [], alumni: [] }
        }
        const missingNames = (people || []).map((row) => row.id).filter((id) => !(nameHits || []).some((row) => row.id === id))
        const { data: extraNames } = missingNames.length
          ? await staff.admin.from("profiles").select("id, full_name").in("id", missingNames)
          : { data: [] as { id: string; full_name: string | null }[] }
        const nameById = new Map(
          [...(nameHits || []), ...(extraNames || [])].map((row) => [row.id, row.full_name || ""])
        )

        // Prefer sameCampus over SQL eq — university strings often differ by punctuation.
        const campusPeople = (people || []).filter((row) => {
          if (!university) return true
          return sameCampus(String(row.university || ""), university)
        })

        const students = campusPeople
          .filter((row) => !studentIsAlumni(row))
          .slice(0, 8)
          .map((row) => hit(row.id, `/candidates/${row.id}`, nameById.get(row.id) || "Student", row.degree))
        const alumni = campusPeople
          .filter((row) => studentIsAlumni(row))
          .slice(0, 8)
          .map((row) => hit(row.id, `/candidates/${row.id}`, nameById.get(row.id) || "Alumni", row.degree))
        return { students, alumni }
      })()

  const [jobsRes, people, recruitersRes] = await Promise.all([
    staff.admin
      .from("jobs")
      .select("id, title, recruiter_profiles(company_name), target_universities, distribution_scope")
      .ilike("title", like)
      .eq("is_active", true)
      .limit(8),
    peoplePromise,
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

  const employers = (recruitersRes.data || []).map((row) =>
    hit(row.id, "/campus/employers", row.company_name || "Employer", row.industry)
  )

  return NextResponse.json({
    jobs,
    students: people.students,
    alumni: people.alumni,
    employers,
  })
}
