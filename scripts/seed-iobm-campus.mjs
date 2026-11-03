/**
 * Idempotent IoBM campus demo content for events, announcements,
 * employer partners, and CDC-approved internships.
 *
 *   node --env-file=.env.local scripts/seed-iobm-campus.mjs
 */
import { createClient } from "@supabase/supabase-js"

const UNI = "Institute of Business Management (IoBM), Karachi"
const CAREEM = "e1e1e1e1-0002-4000-8000-000000000002"
const FOLIO3 = "e1e1e1e1-0003-4000-8000-000000000003"
const MOTIVE = "e1e1e1e1-0004-4000-8000-000000000004"
const SYSTEMS = "e1e1e1e1-0001-4000-8000-000000000001"

const EVENTS = [
  {
    id: "a1b11000-0000-4000-8000-000000000001",
    title: "Resume lab with IoBM CDC",
    kind: "workshop",
    summary: "Bring a printed CV. Advisors mark one version you can upload to swypejobs the same afternoon.",
    location: "CDC, CBM Building, 2nd floor",
    starts_at: "2026-11-10T06:00:00.000Z",
    ends_at: "2026-11-10T08:00:00.000Z",
  },
  {
    id: "a1b11000-0000-4000-8000-000000000002",
    title: "Unilever Pakistan — campus info session",
    kind: "info_session",
    summary: "Summer internship tracks in brand, supply chain, and finance. Q&A with IoBM alumni on the team.",
    location: "Auditorium A, Student Center",
    starts_at: "2026-11-13T10:00:00.000Z",
    ends_at: "2026-11-13T11:30:00.000Z",
  },
  {
    id: "a1b11000-0000-4000-8000-000000000003",
    title: "Interview prep for banks and Big 4",
    kind: "workshop",
    summary: "Case drills, competency answers, and what CDC wants on your experiential record after you accept.",
    location: "CES seminar room 3",
    starts_at: "2026-11-18T09:00:00.000Z",
    ends_at: "2026-11-18T11:00:00.000Z",
  },
  {
    id: "a1b11000-0000-4000-8000-000000000004",
    title: "Spring 2027 career fair",
    kind: "career_fair",
    summary: "40 employers on the Korangi Creek lawn. Bring student ID and two printed CVs. RSVP to skip the queue.",
    location: "Main lawn, Korangi Creek campus",
    starts_at: "2026-11-20T05:00:00.000Z",
    ends_at: "2026-11-20T11:00:00.000Z",
  },
  {
    id: "a1b11000-0000-4000-8000-000000000005",
    title: "Alumni homecoming mixer",
    kind: "other",
    summary: "Mentorship matching for the 2027 cycle. Alumni RSVP; current students attend with a CDC pass.",
    location: "Faculty lounge, CBM Building",
    starts_at: "2026-12-05T13:00:00.000Z",
    ends_at: "2026-12-05T16:00:00.000Z",
  },
]

const ANNOUNCEMENTS = [
  {
    id: "a1b21000-0000-4000-8000-000000000001",
    title: "Acknowledge the Fall 2026 internship reporting rule",
    body: "If you are on an internship this semester, log it under Internships by 21 November. CDC cannot verify late records for the Dean’s list or experiential credit.",
    audience: "students",
    requires_ack: true,
    expires_at: "2026-12-31T18:00:00.000Z",
  },
  {
    id: "a1b21000-0000-4000-8000-000000000002",
    title: "CDC walk-in hours this week",
    body: "Advisors are in the CBM Building, 2nd floor, Monday–Thursday 11:00–15:00. Book Advising if you need a reserved slot for resume review or internship search.",
    audience: "students",
    requires_ack: false,
    expires_at: null,
  },
  {
    id: "a1b21000-0000-4000-8000-000000000003",
    title: "Spring 2027 career fair — employer list is live",
    body: "Careem, Folio3, Motive, Systems Limited, Unilever, and 35 other employers are confirmed. RSVP on Events. Dress code is business casual; student ID required at the gate.",
    audience: "all",
    requires_ack: false,
    expires_at: "2026-11-21T18:00:00.000Z",
  },
  {
    id: "a1b21000-0000-4000-8000-000000000004",
    title: "Alumni mentorship cycle is open",
    body: "The 2027 IoBM alumni mentor roster is open through 15 December. Opt in under Mentorship. CDC matches on industry, not batch year.",
    audience: "alumni",
    requires_ack: false,
    expires_at: "2026-12-16T18:00:00.000Z",
  },
  {
    id: "a1b21000-0000-4000-8000-000000000005",
    title: "Visa workshop before the Malaya semester abroad",
    body: "International Programmes and CDC will walk through the Malaysian student pass on 24 November, 14:00, CES seminar room 1. Bring your passport scan.",
    audience: "students",
    requires_ack: false,
    expires_at: "2026-11-25T18:00:00.000Z",
  },
]

const OPPORTUNITIES = [
  {
    id: "a1b41000-0000-4000-8000-000000000001",
    kind: "study_abroad",
    title: "IoBM × University of Malaya semester abroad",
    country: "Malaysia",
    organization: "University of Malaya · IoBM Office of International Programmes",
    summary:
      "Spend spring 2027 at UM in Kuala Lumpur. Credits map to BBA, BSAF, and CS electives. CDC holds a visa workshop before departure.",
    eligibility: "CGPA 3.0+, two completed semesters, valid passport",
    visa_url: "https://www.imi.gov.my/index.php/en/main-services/visa/student-pass/",
    apply_url: "https://www.iobm.edu.pk",
    deadline: "2026-12-15",
  },
  {
    id: "a1b41000-0000-4000-8000-000000000002",
    kind: "exchange",
    title: "Soka University exchange — Tokyo",
    country: "Japan",
    organization: "Soka University",
    summary:
      "One-semester exchange for IoBM undergraduates. Japanese language is not required for the English-taught track. Housing is on campus.",
    eligibility: "Third-year BBA or BSAF, CGPA 3.2+",
    visa_url: "https://www.mofa.go.jp/j_info/visit/visa/index.html",
    apply_url: "https://www.iobm.edu.pk",
    deadline: "2027-01-20",
  },
  {
    id: "a1b41000-0000-4000-8000-000000000003",
    kind: "scholarship",
    title: "CDC merit scholarship for unpaid internships",
    country: "Pakistan",
    organization: "IoBM Career Development Center",
    summary:
      "PKR 40,000 stipend for students who accept an unpaid internship of at least eight weeks. Report the offer in Internships, then apply here.",
    eligibility: "Enrolled IoBM student, internship letter on company letterhead",
    visa_url: null,
    apply_url: "https://www.iobm.edu.pk",
    deadline: "2026-11-30",
  },
  {
    id: "a1b41000-0000-4000-8000-000000000004",
    kind: "dual_degree",
    title: "IoBM–University of Hull dual MSc pathway",
    country: "United Kingdom",
    organization: "University of Hull",
    summary:
      "Finish the IoBM master’s year, then complete a taught MSc at Hull. CDC and the Graduate Studies office jointly review applications.",
    eligibility: "Final-year master’s, English test as required by Hull",
    visa_url: "https://www.gov.uk/student-visa",
    apply_url: "https://www.iobm.edu.pk",
    deadline: "2027-02-28",
  },
]

const PARTNERS = [
  { recruiter_id: CAREEM, tier: "preferred", notes: "IoBM demo partner — product, ops, and analyst internships." },
  { recruiter_id: FOLIO3, tier: "standard", notes: "IoBM demo partner — software engineering internships." },
  { recruiter_id: MOTIVE, tier: "strategic", notes: "IoBM demo partner — operations and data roles." },
  { recruiter_id: SYSTEMS, tier: "preferred", notes: "IoBM demo partner — finance and consulting internships." },
]

const JOBS = [
  {
    id: "a1b31000-0000-4000-8000-000000000001",
    recruiter_id: CAREEM,
    title: "Campus Business Analyst Intern — IoBM CDC",
    description:
      "Join Careem’s Karachi city team for a 10-week winter internship. You will build weekly demand snapshots, sit with ops leads, and present one improvement brief to CDC at the end of the term. This listing is approved for IoBM students only.",
    job_type: "internship",
    required_skills: ["Excel", "SQL"],
    nice_to_have_skills: ["Tableau", "Python"],
    location: "Karachi — Careem HQ",
    category: "Business / Consulting",
    salary_min: 40000,
    salary_max: 60000,
    compensation_note: "Monthly stipend",
  },
  {
    id: "a1b31000-0000-4000-8000-000000000002",
    recruiter_id: FOLIO3,
    title: "Software Engineering Intern — IoBM pipeline",
    description:
      "Pair with a Folio3 squad in PECHS. You will ship a small feature behind a flag, write tests, and demo to your manager in week eight. CDC will verify the experiential record if you log the offer.",
    job_type: "internship",
    required_skills: ["JavaScript", "Git"],
    nice_to_have_skills: ["React", "TypeScript"],
    location: "Karachi — PECHS",
    category: "Software Engineering",
    salary_min: 35000,
    salary_max: 55000,
    compensation_note: "Monthly stipend",
  },
  {
    id: "a1b31000-0000-4000-8000-000000000003",
    recruiter_id: MOTIVE,
    title: "Operations Intern — Fleet insights",
    description:
      "Support Motive’s Pakistan customer team. You will reconcile onboarding checklists, tag support themes, and sit in one customer call each week. Open to BBA and BSAF students in semester 5+.",
    job_type: "internship",
    required_skills: ["Excel", "Writing"],
    nice_to_have_skills: ["SQL", "Customer research"],
    location: "Hybrid — Karachi",
    category: "Operations",
    salary_min: 30000,
    salary_max: 45000,
    compensation_note: "Monthly stipend",
  },
  {
    id: "a1b31000-0000-4000-8000-000000000004",
    recruiter_id: SYSTEMS,
    title: "Finance intern — IoBM campus hire",
    description:
      "Rotate through FP&A at Systems Limited. Build a monthly variance pack, sit with the controller, and close the internship with a one-page recommendation for CDC’s employer file.",
    job_type: "internship",
    required_skills: ["Excel", "Accounting"],
    nice_to_have_skills: ["Power BI", "Financial modelling"],
    location: "Karachi",
    category: "Finance",
    salary_min: 35000,
    salary_max: 50000,
    compensation_note: "Monthly stipend",
  },
]

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

async function upsert(sb, table, rows, onConflict) {
  const { error, data } = await sb.from(table).upsert(rows, { onConflict }).select("id")
  if (error) throw new Error(`${table}: ${error.message}`)
  return data?.length ?? rows.length
}

async function main() {
  const sb = admin()

  const events = EVENTS.map((row) => ({ ...row, university: UNI, created_by: null }))
  const announcements = ANNOUNCEMENTS.map((row) => ({ ...row, university: UNI, created_by: null }))
  console.log("events", await upsert(sb, "campus_events", events, "id"))
  console.log("announcements", await upsert(sb, "campus_announcements", announcements, "id"))

  const opportunities = OPPORTUNITIES.map((row) => ({ ...row, university: UNI, is_active: true, created_by: null }))
  try {
    console.log("opportunities", await upsert(sb, "international_opportunities", opportunities, "id"))
  } catch (error) {
    console.warn(String(error.message || error))
  }

  for (const partner of PARTNERS) {
    const existing = await sb
      .from("campus_employer_partners")
      .select("id")
      .eq("university", UNI)
      .eq("recruiter_id", partner.recruiter_id)
      .maybeSingle()
    if (existing.data?.id) {
      const { error } = await sb.from("campus_employer_partners").update({ tier: partner.tier, notes: partner.notes }).eq("id", existing.data.id)
      if (error) throw new Error(`partners update: ${error.message}`)
    } else {
      const { error } = await sb.from("campus_employer_partners").insert({ university: UNI, ...partner })
      if (error) throw new Error(`partners insert: ${error.message}`)
    }
  }
  console.log("partners", PARTNERS.length)

  const jobs = JOBS.map((row) => ({
    ...row,
    is_remote: false,
    is_active: true,
    salary_currency: "PKR",
    screening_questions: [],
    required_semesters: [],
    distribution_scope: "partner_universities",
    target_universities: [UNI],
  }))
  console.log("jobs", await upsert(sb, "jobs", jobs, "id"))

  await sb.from("campus_job_reviews").delete().eq("university", UNI).in(
    "job_id",
    JOBS.map((job) => job.id)
  )
  const reviews = JOBS.map((job) => ({
    job_id: job.id,
    university: UNI,
    status: "approved",
    reviewed_by: null,
    reviewed_at: new Date().toISOString(),
    reason: "IoBM CDC demo approval",
  }))
  const { error: reviewError } = await sb.from("campus_job_reviews").insert(reviews)
  if (reviewError) throw new Error(`reviews: ${reviewError.message}`)
  console.log("reviews", reviews.length)

  const { data: loose } = await sb.from("student_profiles").select("id, university").ilike("university", "%iobm%")
  const stale = (loose || []).filter((row) => row.university !== UNI)
  if (stale.length) {
    for (const row of stale) {
      await sb.from("student_profiles").update({ university: UNI }).eq("id", row.id)
    }
    console.log("normalized student universities", stale.length)
  }

  const check = await sb.from("campus_events").select("id, title").eq("university", UNI)
  console.log(
    "IoBM events now",
    (check.data || []).map((row) => row.title)
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
