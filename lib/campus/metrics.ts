import { cache } from "react"
import { createClient } from "@/lib/supabase/server"
import type { CampusAccess, CampusSnapshot, OutcomeSlice, AttentionStudent } from "@/lib/campus/types"
import {
  average,
  countBy,
  daysBetween,
  degreeLevel,
  employerType,
  hoursBetween,
  inLastDays,
  median,
  pct,
  workMode,
} from "@/lib/campus/helpers"

const LIMIT = 4000
const OFFER = new Set(["offer", "hired"])
const INTERVIEW = new Set(["interview", "offer", "hired"])

type StudentRow = {
  id: string
  university: string | null
  degree: string | null
  graduation_year: number | null
  institution_type: string | null
  skills: string[] | null
  preferred_job_categories: string[] | null
  resume_url: string | null
  created_at: string
  updated_at?: string
  profiles?: { full_name?: string | null; created_at?: string | null; updated_at?: string | null } | null
}

type SwipeRow = { student_id: string; job_id: string; direction: string; created_at: string }
type MatchRow = {
  student_id: string
  recruiter_id: string
  job_id: string
  pipeline_status: string | null
  created_at: string
}
type JobRow = {
  id: string
  recruiter_id: string
  title: string
  job_type: string | null
  category: string | null
  location: string | null
  is_remote: boolean | null
  is_active: boolean | null
  required_skills: string[] | null
  created_at: string
}
type RecruiterRow = {
  id: string
  company_name: string
  employee_count: string | null
  industry: string | null
  is_approved: boolean | null
  created_at: string
}

function emptySlice(checkpoint: OutcomeSlice["checkpoint"], source: OutcomeSlice["source"]): OutcomeSlice {
  return { checkpoint, employed: 0, gradSchool: 0, stillSeeking: 0, notSeeking: 0, unknown: 0, n: 0, source }
}

function sourced(value: number | null, n: number, source: CampusSnapshot["kpis"]["placementRate"]["source"], note?: string) {
  return { value, n, source, note }
}

export const loadCampusSnapshot = cache(async (access: CampusAccess, universityFilter?: string | null): Promise<CampusSnapshot> => {
  const supabase = await createClient()
  const university = universityFilter ?? access.university
  const missingTables: string[] = []

  let studentsQuery = supabase
    .from("student_profiles")
    .select("id, university, degree, graduation_year, institution_type, skills, preferred_job_categories, resume_url, created_at, updated_at, profiles(full_name, created_at, updated_at)")
    .limit(LIMIT)
  if (university) studentsQuery = studentsQuery.eq("university", university)

  const studentsRes = await studentsQuery
  const students = (studentsRes.data || []) as StudentRow[]
  const studentIds = students.map((s) => s.id)
  const studentMap = new Map(students.map((s) => [s.id, s]))

  const [swipesRes, matchesRes, jobsRes, recruitersRes] = await Promise.all([
    studentIds.length
      ? supabase.from("job_swipes").select("student_id, job_id, direction, created_at").in("student_id", studentIds.slice(0, 2000)).limit(LIMIT)
      : Promise.resolve({ data: [] as SwipeRow[] }),
    studentIds.length
      ? supabase.from("matches").select("student_id, recruiter_id, job_id, pipeline_status, created_at").in("student_id", studentIds.slice(0, 2000)).limit(LIMIT)
      : Promise.resolve({ data: [] as MatchRow[] }),
    supabase
      .from("jobs")
      .select("id, recruiter_id, title, job_type, category, location, is_remote, is_active, required_skills, created_at")
      .limit(LIMIT),
    supabase
      .from("recruiter_profiles")
      .select("id, company_name, employee_count, industry, is_approved, created_at")
      .eq("is_approved", true)
      .limit(LIMIT),
  ])

  const swipes = (swipesRes.data || []) as SwipeRow[]
  const matches = (matchesRes.data || []) as MatchRow[]
  const jobs = (jobsRes.data || []) as JobRow[]
  const recruiters = (recruitersRes.data || []) as RecruiterRow[]
  const jobMap = new Map(jobs.map((j) => [j.id, j]))
  const recruiterMap = new Map(recruiters.map((r) => [r.id, r]))
  const activeJobs = jobs.filter((j) => j.is_active)

  async function optional<T>(table: string, exec: () => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
    const { data, error } = await exec()
    if (error) {
      missingTables.push(table)
      return []
    }
    return data || []
  }

  const uni = university || ""
  const outcomes = await optional("campus_outcomes", () => {
    let q = supabase.from("campus_outcomes").select("*").limit(LIMIT)
    if (uni) q = q.eq("university", uni)
    return q
  })
  const demographics = await optional("campus_demographics", () =>
    supabase.from("campus_demographics").select("*").in("student_id", studentIds.length ? studentIds.slice(0, 2000) : ["00000000-0000-0000-0000-000000000000"]).limit(LIMIT)
  )
  const events = await optional("campus_events", () => {
    let q = supabase.from("campus_events").select("*").limit(200)
    if (uni) q = q.eq("university", uni)
    return q
  })
  const rsvps = await optional("campus_event_rsvps", () =>
    supabase.from("campus_event_rsvps").select("event_id, student_id, hired_from_event").limit(LIMIT)
  )
  const appointments = await optional("campus_appointments", () => {
    let q = supabase.from("campus_appointments").select("*").limit(LIMIT)
    if (uni) q = q.eq("university", uni)
    return q
  })
  const reviews = await optional("campus_resume_reviews", () => {
    let q = supabase.from("campus_resume_reviews").select("*").limit(LIMIT)
    if (uni) q = q.eq("university", uni)
    return q
  })
  const surveys = await optional("campus_surveys", () => {
    let q = supabase.from("campus_surveys").select("*").limit(LIMIT)
    if (uni) q = q.eq("university", uni)
    return q
  })
  const partners = await optional("campus_employer_partners", () => {
    let q = supabase.from("campus_employer_partners").select("*").limit(200)
    if (uni) q = q.eq("university", uni)
    return q
  })

  const currentYear = new Date().getFullYear()
  const seniors = students.filter((s) => s.graduation_year === currentYear || s.graduation_year === currentYear + 1)
  const apps = swipes.filter((s) => s.direction === "right")
  const interviews = matches.filter((m) => INTERVIEW.has(m.pipeline_status || ""))
  const offers = matches.filter((m) => OFFER.has(m.pipeline_status || ""))
  const hired = matches.filter((m) => m.pipeline_status === "hired")

  const swipesByStudent = new Map<string, SwipeRow[]>()
  for (const s of swipes) {
    const list = swipesByStudent.get(s.student_id) || []
    list.push(s)
    swipesByStudent.set(s.student_id, list)
  }

  const lastActivity = (id: string) => {
    const list = swipesByStudent.get(id) || []
    const latest = list.reduce((m, row) => (row.created_at > m ? row.created_at : m), "")
    const stu = studentMap.get(id)
    return latest || stu?.updated_at || stu?.profiles?.updated_at || stu?.created_at || ""
  }

  const activeMonth = students.filter((s) => inLastDays(lastActivity(s.id), 30)).length
  const activeWeek = students.filter((s) => inLastDays(lastActivity(s.id), 7)).length
  const inactive = students.length - activeMonth

  const complete = students.filter((s) => s.university && s.degree && (s.skills?.length || 0) >= 3 && s.resume_url).length
  const withResume = students.filter((s) => s.resume_url).length
  const withSkills = students.filter((s) => (s.skills?.length || 0) >= 3).length

  const zeroActivity: AttentionStudent[] = students
    .filter((s) => !swipesByStudent.has(s.id))
    .slice(0, 40)
    .map((s) => ({
      id: s.id,
      name: s.profiles?.full_name || "Student",
      university: s.university,
      major: s.degree,
      year: s.graduation_year,
      reason: "No swipes since joining",
    }))

  const quietSeniors: AttentionStudent[] = seniors
    .filter((s) => !apps.some((a) => a.student_id === s.id))
    .slice(0, 40)
    .map((s) => ({
      id: s.id,
      name: s.profiles?.full_name || "Student",
      university: s.university,
      major: s.degree,
      year: s.graduation_year,
      reason: "Senior with no applications",
    }))

  const goingQuiet: AttentionStudent[] = students
    .filter((s) => {
      const last = lastActivity(s.id)
      return swipesByStudent.has(s.id) && last && !inLastDays(last, 14)
    })
    .slice(0, 40)
    .map((s) => ({
      id: s.id,
      name: s.profiles?.full_name || "Student",
      university: s.university,
      major: s.degree,
      year: s.graduation_year,
      reason: "Quiet for 14+ days",
    }))

  const attention = [...quietSeniors, ...goingQuiet, ...zeroActivity]
    .filter((row, i, arr) => arr.findIndex((r) => r.id === row.id) === i)
    .slice(0, 50)

  const slices: OutcomeSlice[] = (["graduation", "3mo", "6mo", "12mo"] as const).map((checkpoint) => {
    const rows = outcomes.filter((o) => (o as { checkpoint: string }).checkpoint === checkpoint)
    if (!rows.length) {
      if (checkpoint !== "graduation") return emptySlice(checkpoint, "survey")
      const proxy = emptySlice("graduation", "platform")
      proxy.employed = hired.length
      proxy.stillSeeking = Math.max(0, seniors.filter((s) => apps.some((a) => a.student_id === s.id) && !hired.some((h) => h.student_id === s.id)).length)
      proxy.notSeeking = seniors.filter((s) => !swipesByStudent.has(s.id)).length
      proxy.unknown = Math.max(0, seniors.length - proxy.employed - proxy.stillSeeking - proxy.notSeeking)
      proxy.n = seniors.length
      return proxy
    }
    const statusOf = (s: string) => rows.filter((o) => (o as { status: string }).status === s).length
    return {
      checkpoint,
      employed: statusOf("employed"),
      gradSchool: statusOf("grad_school"),
      stillSeeking: statusOf("still_seeking"),
      notSeeking: statusOf("not_seeking"),
      unknown: statusOf("unknown") + statusOf("military") + statusOf("volunteer"),
      n: rows.length,
      source: "survey",
    }
  })

  const gradSlice = slices.find((s) => s.checkpoint === "graduation")!
  const placementRate = sourced(pct(gradSlice.employed + gradSlice.gradSchool, gradSlice.n), gradSlice.n, gradSlice.source, "Employed + grad school")

  const internships = activeJobs.filter((j) => j.job_type === "internship")
  const internApps = apps.filter((a) => jobMap.get(a.job_id)?.job_type === "internship")
  const internStudents = new Set(internApps.map((a) => a.student_id)).size
  const converted = outcomes.filter((o) => (o as { internship_converted?: boolean }).internship_converted).length

  const salaries = outcomes
    .map((o) => Number((o as { salary?: number | null }).salary))
    .filter((n) => Number.isFinite(n) && n > 0)

  const salaryGroup = (keyFn: (o: Record<string, unknown>) => string) => {
    const groups = new Map<string, number[]>()
    for (const raw of outcomes) {
      const o = raw as Record<string, unknown>
      const pay = Number(o.salary)
      if (!Number.isFinite(pay) || pay <= 0) continue
      const key = keyFn(o)
      groups.set(key, [...(groups.get(key) || []), pay])
    }
    return [...groups.entries()].map(([group, values]) => ({
      group,
      average: average(values),
      median: median(values),
      n: values.length,
    }))
  }

  const offerTimes = offers
    .map((m) => {
      const stu = studentMap.get(m.student_id)
      if (!stu) return null
      return daysBetween(stu.created_at, m.created_at)
    })
    .filter((n): n is number => n != null)

  const firstSwipe = students
    .map((s) => {
      const list = swipesByStudent.get(s.id) || []
      if (!list.length) return false
      return true
    })
    .filter(Boolean).length

  const preferredHits = students.filter((s) => {
    const prefs = s.preferred_job_categories || []
    if (!prefs.length) return false
    return activeJobs.some((j) => j.category && prefs.includes(j.category))
  }).length

  const employerSkills = countBy(activeJobs.flatMap((j) => j.required_skills || []))
  const studentSkills = countBy(students.flatMap((s) => s.skills || []))
  const have = new Map(studentSkills.map((r) => [r.label.toLowerCase(), r.value]))
  const skillsGaps = employerSkills.slice(0, 12).map((row) => ({
    skill: row.label,
    jobs: row.value,
    students: have.get(row.label.toLowerCase()) || 0,
  }))

  const recruiterFirstReply = matches
    .map((m) => {
      if (!INTERVIEW.has(m.pipeline_status || "") && m.pipeline_status !== "matched") return null
      const apply = apps.find((a) => a.student_id === m.student_id && a.job_id === m.job_id)
      if (!apply) return null
      return hoursBetween(apply.created_at, m.created_at)
    })
    .filter((n): n is number => n != null)

  const responded = recruiterFirstReply.length
  const appCount = apps.length

  const rightByCategory = countBy(swipes.filter((s) => s.direction === "right").map((s) => jobMap.get(s.job_id)?.category))
  const leftByCategory = countBy(swipes.filter((s) => s.direction === "left").map((s) => jobMap.get(s.job_id)?.category))
  const trendingIndustries = countBy(
    swipes.filter((s) => s.direction === "right").map((s) => recruiterMap.get(jobMap.get(s.job_id)?.recruiter_id || "")?.industry)
  )

  const studentInterest = countBy(students.flatMap((s) => s.preferred_job_categories || []))
  const jobsByCat = countBy(activeJobs.map((j) => j.category))
  const jobCatMap = new Map(jobsByCat.map((r) => [r.label, r.value]))
  const wantVsHave = studentInterest.slice(0, 10).map((row) => ({
    category: row.label,
    studentInterest: row.value,
    openJobs: jobCatMap.get(row.label) || 0,
  }))

  const studentsByMajor = countBy(students.map((s) => s.degree))
  const jobsByMajorProxy = countBy(activeJobs.map((j) => j.category))
  const jobMajorMap = new Map(jobsByMajorProxy.map((r) => [r.label.toLowerCase(), r.value]))
  const supplyGaps = studentsByMajor.slice(0, 12).map((row) => {
    const jobsFor = jobMajorMap.get((row.label || "").toLowerCase()) || 0
    return { major: row.label, students: row.value, jobs: jobsFor, gap: row.value - jobsFor }
  })

  const appsByRecruiter = new Map<string, number>()
  for (const a of apps) {
    const rid = jobMap.get(a.job_id)?.recruiter_id
    if (!rid) continue
    appsByRecruiter.set(rid, (appsByRecruiter.get(rid) || 0) + 1)
  }
  const hiresByRecruiter = new Map<string, number>()
  for (const m of hired) hiresByRecruiter.set(m.recruiter_id, (hiresByRecruiter.get(m.recruiter_id) || 0) + 1)
  const topEmployers = [...appsByRecruiter.entries()]
    .map(([id, n]) => ({ name: recruiterMap.get(id)?.company_name || "Employer", hires: hiresByRecruiter.get(id) || 0, apps: n }))
    .sort((a, b) => b.apps - a.apps)
    .slice(0, 10)

  const consentedDemo = demographics.filter((d) => (d as { consent_at?: string | null }).consent_at)
  const equityAvailable = consentedDemo.length > 0

  const npsOffice = surveys.filter((s) => (s as { target?: string }).target === "career_office").map((s) => Number((s as { nps?: number }).nps)).filter((n) => Number.isFinite(n))
  const npsPlatform = surveys.filter((s) => (s as { target?: string }).target === "platform").map((s) => Number((s as { nps?: number }).nps)).filter((n) => Number.isFinite(n))

  const noShows = appointments.filter((a) => (a as { status?: string }).status === "no_show").length
  const eventRows = events.map((e) => {
    const ev = e as { id: string; title: string; kind: string }
    const evRsvps = rsvps.filter((r) => (r as { event_id: string }).event_id === ev.id)
    return {
      id: ev.id,
      title: ev.title,
      kind: ev.kind,
      rsvps: evRsvps.length,
      hires: evRsvps.filter((r) => (r as { hired_from_event?: boolean }).hired_from_event).length,
    }
  })

  const underemployed = outcomes.filter((o) => (o as { requires_degree?: boolean | null }).requires_degree === false && (o as { status?: string }).status === "employed").length

  const alerts = [
    quietSeniors.length
      ? { id: "seniors-no-apps", severity: "high" as const, title: "Seniors with no applications", detail: "Nudge this cohort before graduation.", href: "/campus/actions?segment=seniors", count: quietSeniors.length }
      : null,
    goingQuiet.length
      ? { id: "quiet", severity: "medium" as const, title: "Students going quiet", detail: "No swipe activity in 14 days.", href: "/campus/actions?segment=quiet", count: goingQuiet.length }
      : null,
    zeroActivity.length
      ? { id: "zero", severity: "medium" as const, title: "Registered with zero activity", detail: "Priority outreach list.", href: "/campus/actions?segment=zero", count: zeroActivity.length }
      : null,
    supplyGaps.some((g) => g.gap > 10)
      ? { id: "gaps", severity: "low" as const, title: "Demand gaps vs. student majors", detail: "Employer outreach lists are ready.", href: "/campus/market", count: supplyGaps.filter((g) => g.gap > 0).length }
      : null,
  ].filter(Boolean) as CampusSnapshot["alerts"]

  const signup = students.length
  const profileDone = complete
  const firstSwipeCount = firstSwipe
  const appStudents = new Set(apps.map((a) => a.student_id)).size
  const interviewStudents = new Set(interviews.map((m) => m.student_id)).size
  const offerStudents = new Set(offers.map((m) => m.student_id)).size

  return {
    access: { ...access, university },
    missingTables: [...new Set(missingTables)],
    kpis: {
      placementRate,
      activeStudentsMonth: sourced(activeMonth, students.length, "platform"),
      openJobsMatched: sourced(activeJobs.filter((j) => students.some((s) => (s.preferred_job_categories || []).includes(j.category || ""))).length || activeJobs.length, activeJobs.length, "platform"),
      employersEngaged: sourced(new Set(apps.map((a) => jobMap.get(a.job_id)?.recruiter_id).filter(Boolean)).size, recruiters.length, "platform"),
      needingAttention: sourced(attention.length, students.length, "platform"),
      equityGapFlag: {
        flagged: equityAvailable && consentedDemo.length < students.length * 0.3,
        detail: equityAvailable
          ? "Placement breakdowns are only shown for students with FERPA consent."
          : "No consented demographic file yet — equity flags stay off until students opt in.",
        source: equityAvailable ? "self_reported" : "survey",
      },
    },
    outcomes: {
      slices,
      internshipParticipation: sourced(pct(internStudents, students.length), internStudents, "platform"),
      internshipConversion: sourced(outcomes.length ? pct(converted, internStudents || converted) : null, converted, outcomes.length ? "survey" : "platform", "From first-destination records"),
      salariesByMajor: salaryGroup((o) => {
        const stu = studentMap.get(String(o.student_id))
        return stu?.degree || "Unknown major"
      }),
      salariesByDegree: salaryGroup((o) => degreeLevel(studentMap.get(String(o.student_id))?.degree)),
      timeToFirstOfferDays: sourced(average(offerTimes), offerTimes.length, "platform"),
      industries: countBy(hired.map((m) => recruiterMap.get(m.recruiter_id)?.industry).concat(outcomes.map((o) => (o as { industry?: string }).industry))),
      roles: countBy(hired.map((m) => jobMap.get(m.job_id)?.title).concat(outcomes.map((o) => (o as { job_title?: string }).job_title))),
      geos: countBy(hired.map((m) => jobMap.get(m.job_id)?.location).concat(outcomes.map((o) => (o as { location?: string }).location))),
      employerTypes: countBy(
        hired
          .map((m) => {
            const r = recruiterMap.get(m.recruiter_id)
            return employerType({ employeeCount: r?.employee_count, industry: r?.industry })
          })
          .concat(outcomes.map((o) => (o as { employer_type?: string }).employer_type))
      ),
      underemployed: sourced(outcomes.length ? pct(underemployed, outcomes.filter((o) => (o as { status?: string }).status === "employed").length) : null, underemployed, "survey"),
    },
    engagement: {
      registered: signup,
      activeWeek,
      activeMonth,
      inactive,
      profileComplete: sourced(pct(profileDone, signup), profileDone, "platform"),
      resumeUploaded: sourced(pct(withResume, signup), withResume, "platform"),
      skillsFilled: sourced(pct(withSkills, signup), withSkills, "platform"),
      swipesPerStudent: signup ? Math.round((swipes.length / signup) * 10) / 10 : 0,
      appsPerStudent: signup ? Math.round((apps.length / signup) * 10) / 10 : 0,
      interviewsPerStudent: signup ? Math.round((interviews.length / signup) * 10) / 10 : 0,
      zeroActivity,
      byYear: countBy(students.map((s) => (s.graduation_year ? String(s.graduation_year) : null))),
      byMajor: studentsByMajor.slice(0, 12),
      byCollege: countBy(students.map((s) => s.institution_type || s.university)),
      funnel: [
        { label: "Signup", value: signup },
        { label: "Profile", value: profileDone },
        { label: "First swipe", value: firstSwipeCount },
        { label: "Application", value: appStudents },
        { label: "Interview", value: interviewStudents },
        { label: "Offer", value: offerStudents },
      ],
      rsvps: rsvps.length,
      appointments: appointments.length,
      resumeReviews: reviews.length,
    },
    market: {
      activeEmployers: recruiters.length,
      newEmployers: recruiters.filter((r) => inLastDays(r.created_at, 30)).length,
      openJobs: activeJobs.filter((j) => j.job_type !== "internship").length,
      internships: internships.length,
      byMajor: jobsByCat.slice(0, 12),
      byLocation: countBy(activeJobs.map((j) => j.location)).slice(0, 12),
      byWorkMode: countBy(activeJobs.map((j) => workMode(j))),
      supplyGaps: supplyGaps.sort((a, b) => b.gap - a.gap),
      topEmployers,
      repeatEmployers: [...hiresByRecruiter.values()].filter((n) => n > 1).length,
      responseRate: sourced(pct(responded, appCount), responded, "platform"),
      timeToRespondHours: sourced(average(recruiterFirstReply), recruiterFirstReply.length, "platform"),
      partners: partners.map((p) => ({
        name: recruiterMap.get((p as { recruiter_id: string }).recruiter_id)?.company_name || "Partner",
        tier: (p as { tier: string }).tier,
      })),
    },
    matchQuality: {
      preferenceMatchRate: sourced(pct(preferredHits, students.filter((s) => (s.preferred_job_categories || []).length).length), preferredHits, "platform"),
      skillsEmployersWant: employerSkills.slice(0, 12),
      skillsStudentsHave: studentSkills.slice(0, 12),
      skillsGaps,
      demandByMajor: studentsByMajor.slice(0, 8).map((row) => ({
        major: row.label,
        roles: jobsByCat.slice(0, 3).map((r) => r.label),
      })),
      appToInterview: sourced(pct(interviews.length, apps.length), interviews.length, "platform"),
      interviewToOffer: sourced(pct(offers.length, interviews.length), offers.length, "platform"),
      offerAccept: sourced(pct(hired.length, offers.length), hired.length, "platform"),
      declineReasons: [{ label: "Not captured yet", value: 0 }],
    },
    equity: {
      available: equityAvailable,
      consented: consentedDemo.length,
      byGender: countBy(consentedDemo.map((d) => (d as { gender?: string }).gender)),
      byRace: countBy(consentedDemo.map((d) => (d as { race_ethnicity?: string }).race_ethnicity)),
      firstGenPlacement: sourced(null, consentedDemo.filter((d) => (d as { first_gen?: boolean }).first_gen).length, "self_reported", "Needs linked outcomes"),
      international: {
        n: consentedDemo.filter((d) => (d as { international?: boolean }).international).length,
        cptOpt: consentedDemo.filter((d) => /cpt|opt/i.test((d as { work_auth?: string }).work_auth || "")).length,
        sponsorshipJobs: activeJobs.filter((j) => /sponsor/i.test(j.title) || /sponsor/i.test(recruiterMap.get(j.recruiter_id)?.industry || "")).length,
      },
      veteran: consentedDemo.filter((d) => (d as { veteran?: boolean }).veteran).length,
      transfer: consentedDemo.filter((d) => (d as { transfer_student?: boolean }).transfer_student).length,
      gaps: equityAvailable
        ? [{ label: "Sample too small for disparity flags", delta: "Collect more consented records" }]
        : [],
    },
    operations: {
      appointments: appointments.length,
      noShowRate: sourced(pct(noShows, appointments.length), noShows, "platform"),
      waitHint: appointments.length ? "Wait time needs scheduled slots with timestamps." : "No advisor calendar connected yet.",
      events: eventRows,
      resumeReviews: reviews.length,
      npsOffice: sourced(average(npsOffice), npsOffice.length, "survey"),
      npsPlatform: sourced(average(npsPlatform), npsPlatform.length, "survey"),
      caseload: sourced(access.staffRole === "advisor" ? students.length : pct(students.length, Math.max(1, new Set(appointments.map((a) => (a as { advisor_id?: string }).advisor_id)).size) || 1), students.length, "platform"),
    },
    swipeSignals: {
      rightByCategory,
      leftByCategory,
      trendingIndustries,
      wantVsHave,
    },
    alerts,
    attention,
  }
})
