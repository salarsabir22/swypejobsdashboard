import { cache } from "react"
import { createClient } from "@/lib/supabase/server"
import { countBy, inLastDays, pct } from "@/lib/campus/helpers"
import type { AdminSnapshot } from "@/lib/admin/types"
import type { AdminStaffRole } from "@/lib/admin/access"

const LIMIT = 4000

export const loadAdminSnapshot = cache(async (staffRole: AdminStaffRole): Promise<AdminSnapshot> => {
  const supabase = await createClient()
  const missingTables: string[] = []

  const [profilesRes, studentsRes, recruitersRes, jobsRes, swipesRes, matchesRes, reportsRes] = await Promise.all([
    supabase.from("profiles").select("id, role, created_at, updated_at").limit(LIMIT),
    supabase.from("student_profiles").select("id, university, resume_url, skills, degree, created_at").limit(LIMIT),
    supabase.from("recruiter_profiles").select("id, company_name, is_approved, website_url, created_at").limit(LIMIT),
    supabase.from("jobs").select("id, recruiter_id, title, description, is_active, location, required_skills, created_at, updated_at").limit(LIMIT),
    supabase.from("job_swipes").select("student_id, job_id, direction, created_at").limit(LIMIT),
    supabase.from("matches").select("student_id, pipeline_status, created_at").limit(LIMIT),
    supabase.from("reports").select("id, status, created_at, reason").limit(LIMIT),
  ])

  async function optional<T>(table: string, run: () => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
    const { data, error } = await run()
    if (error) {
      missingTables.push(table)
      return [] as T[]
    }
    return data || []
  }

  const billing = await optional<{ mrr: number | null }>("employer_billing", () =>
    supabase.from("employer_billing").select("mrr").limit(500)
  )
  const unis = await optional<{ status: string }>("university_orgs", () =>
    supabase.from("university_orgs").select("status").limit(200)
  )
  const jobMod = await optional<{ status: string }>("job_moderation", () =>
    supabase.from("job_moderation").select("status").limit(LIMIT)
  )

  const profiles = profilesRes.data || []
  const students = studentsRes.data || []
  const recruiters = recruitersRes.data || []
  const jobs = jobsRes.data || []
  const swipes = swipesRes.data || []
  const matches = matchesRes.data || []
  const reports = reportsRes.data || []

  const activityIso = [
    ...swipes.map((s) => s.created_at),
    ...profiles.map((p) => p.updated_at || p.created_at),
  ].filter(Boolean) as string[]

  const uniqueOn = (days: number) => {
    const ids = new Set<string>()
    for (const s of swipes) {
      if (inLastDays(s.created_at, days)) ids.add(s.student_id)
    }
    return ids.size
  }

  const dau = uniqueOn(1)
  const wau = uniqueOn(7)
  const mau = uniqueOn(30)
  const hour = (iso: string) => `${new Date(iso).getUTCHours().toString().padStart(2, "0")}:00 UTC`
  const peakHours = countBy(activityIso.filter((d) => inLastDays(d, 7)).map(hour)).slice(0, 8)

  const studentsComplete = students.filter((s) => s.degree && (s.skills?.length || 0) >= 3 && s.resume_url).length
  const firstSwipe = new Set(swipes.map((s) => s.student_id)).size
  const firstApp = new Set(swipes.filter((s) => s.direction === "right").map((s) => s.student_id)).size

  const cohort = (days: number) => {
    const windowStart = Date.now() - (days + 7) * 86400000
    const windowEnd = Date.now() - days * 86400000
    const signed = profiles.filter((p) => {
      const t = new Date(p.created_at).getTime()
      return p.role === "student" && t >= windowStart && t < windowEnd
    })
    if (!signed.length) return null
    const retained = signed.filter((p) =>
      swipes.some((s) => {
        if (s.student_id !== p.id) return false
        return new Date(s.created_at).getTime() >= new Date(p.created_at).getTime() + days * 86400000
      })
    ).length
    return pct(retained, signed.length)
  }

  const openReports = reports.filter((r) => !r.status || r.status === "open" || r.status === "pending").length
  const slaBreaches = reports.filter((r) => {
    const open = !r.status || r.status === "open" || r.status === "pending"
    return open && !inLastDays(r.created_at, 1)
  }).length

  const pendingJobs =
    jobMod.filter((j) => j.status === "pending").length || jobs.filter((j) => j.is_active && inLastDays(j.created_at, 2)).length

  const right = swipes.filter((s) => s.direction === "right").length
  const interviews = matches.filter((m) => ["interview", "offer", "hired"].includes(m.pipeline_status || "")).length
  const hires = matches.filter((m) => m.pipeline_status === "hired").length

  const mrr = billing.length ? billing.reduce((s, b) => s + Number(b.mrr || 0), 0) : null

  return {
    staffRole,
    missingTables: [...new Set(missingTables)],
    health: {
      label: "Degraded instrumentation",
      ok: true,
      detail: "App is serving. Uptime, API latency, and crash SDKs are not wired — this tile is process-alive, not a full SRE board.",
    },
    kpis: {
      liveUsers: uniqueOn(0.04) || dau,
      dau,
      wau,
      mau,
      pendingEmployers: recruiters.filter((r) => !r.is_approved).length,
      pendingJobs,
      openReports,
      slaBreaches,
      newStudents: profiles.filter((p) => p.role === "student" && inLastDays(p.created_at, 7)).length,
      newEmployers: recruiters.filter((r) => inLastDays(r.created_at, 7)).length,
      newUniversities: unis.filter((u) => u.status === "pending").length,
      mrr,
    },
    traffic: {
      peakHours,
      signups7: profiles.filter((p) => inLastDays(p.created_at, 7)).length,
      churnProxy: pct(
        profiles.filter((p) => p.role === "student" && !inLastDays(p.updated_at || p.created_at, 30)).length,
        profiles.filter((p) => p.role === "student").length
      ),
      sources: [{ label: "Unattributed (no tracker yet)", value: profiles.length }],
      devices: [{ label: "Web", value: profiles.length }],
      geos: countBy(jobs.map((j) => j.location)).slice(0, 10),
      universities: countBy(students.map((s) => s.university)).slice(0, 10),
      funnel: [
        { label: "Signup", value: profiles.filter((p) => p.role === "student").length },
        { label: "Profile complete", value: studentsComplete },
        { label: "First swipe", value: firstSwipe },
        { label: "First application", value: firstApp },
      ],
      retention: { d1: cohort(1), d7: cohort(7), d30: cohort(30) },
    },
    matching: {
      swipes: swipes.length,
      rightRatio: pct(right, swipes.length),
      matchRate: pct(matches.length, right || matches.length),
      interviewRate: pct(interviews, matches.length),
      hireRate: pct(hires, matches.length),
      coldStartUsers: students.filter((s) => !swipes.some((sw) => sw.student_id === s.id)).length,
    },
  }
})
