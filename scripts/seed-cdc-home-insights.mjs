/**
 * Fills the CDC home insight cards: applications across the window,
 * employer / office NPS, and international programs.
 *
 *   node --env-file=.env.local scripts/seed-cdc-home-insights.mjs
 */
import { createClient } from "@supabase/supabase-js"

const UNI = "Institute of Business Management (IoBM), Karachi"

const OPPORTUNITIES = [
  {
    id: "a1b41000-0000-4000-8000-000000000001",
    kind: "study_abroad",
    title: "IoBM × University of Malaya semester abroad",
    country: "Malaysia",
    organization: "University of Malaya · IoBM Office of International Programmes",
    summary: "Spend spring 2027 at UM in Kuala Lumpur. Credits map to BBA, BSAF, and CS electives.",
    eligibility: "CGPA 3.0+, two completed semesters, valid passport",
    deadline: "2026-12-15",
  },
  {
    id: "a1b41000-0000-4000-8000-000000000002",
    kind: "exchange",
    title: "Soka University exchange — Tokyo",
    country: "Japan",
    organization: "Soka University",
    summary: "One-semester exchange. Japanese is not required for the English-taught track.",
    eligibility: "Third-year BBA or BSAF, CGPA 3.2+",
    deadline: "2027-01-20",
  },
  {
    id: "a1b41000-0000-4000-8000-000000000003",
    kind: "scholarship",
    title: "CDC merit scholarship for unpaid internships",
    country: "Pakistan",
    organization: "IoBM Career Development Center",
    summary: "PKR 40,000 stipend for unpaid internships of at least eight weeks.",
    eligibility: "Enrolled IoBM student, internship letter on company letterhead",
    deadline: "2026-11-30",
  },
  {
    id: "a1b41000-0000-4000-8000-000000000004",
    kind: "dual_degree",
    title: "IoBM–University of Hull dual MSc pathway",
    country: "United Kingdom",
    organization: "University of Hull",
    summary: "Finish the IoBM master’s year, then complete a taught MSc at Hull.",
    eligibility: "Final-year master’s, English test as required by Hull",
    deadline: "2027-02-28",
  },
]

const SURVEYS = [
  { university: UNI, target: "employer", nps: 54 },
  { university: UNI, target: "employer", nps: 61 },
  { university: UNI, target: "employer", nps: 47 },
  { university: UNI, target: "employer", nps: 58 },
  { university: UNI, target: "employer", nps: 52 },
  { university: UNI, target: "career_office", nps: 62 },
  { university: UNI, target: "career_office", nps: 71 },
  { university: UNI, target: "platform", nps: 48 },
]

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

function daysAgo(days) {
  return new Date(Date.now() - days * 86400000).toISOString()
}

async function main() {
  const sb = admin()

  const opportunities = OPPORTUNITIES.map((row) => ({ ...row, university: UNI, is_active: true }))
  const { error: oppError } = await sb.from("international_opportunities").upsert(opportunities, { onConflict: "id" })
  if (oppError) {
    console.warn("international_opportunities:", oppError.message)
    const fallback = OPPORTUNITIES.map((row) => ({
      id: row.id,
      university: UNI,
      title: row.title,
      kind: "other",
      location: row.country,
      summary: `INTERNATIONAL_PROGRAM\n${row.organization}\n${row.summary}`,
      starts_at: "2026-10-01T08:00:00.000Z",
      ends_at: "2026-10-01T09:00:00.000Z",
      created_by: null,
    }))
    const { error: eventError } = await sb.from("campus_events").upsert(fallback, { onConflict: "id" })
    if (eventError) console.warn("campus_events fallback:", eventError.message)
    else console.log("international program events", fallback.length)
  } else {
    console.log("opportunities", OPPORTUNITIES.length)
  }

  await sb.from("campus_surveys").delete().eq("university", UNI)
  const { error: surveyError } = await sb.from("campus_surveys").insert(SURVEYS)
  if (surveyError) console.warn("campus_surveys:", surveyError.message)
  else console.log("surveys", SURVEYS.length)

  const { data: students, error: studentError } = await sb.from("student_profiles").select("id").eq("university", UNI)
  if (studentError) {
    console.warn("student_profiles:", studentError.message)
    return
  }
  const studentIds = (students || []).map((row) => row.id)
  if (!studentIds.length) {
    console.warn("No IoBM students to spread applications across.")
    return
  }

  const { data: swipes, error: swipeError } = await sb
    .from("job_swipes")
    .select("id")
    .in("student_id", studentIds)
    .eq("direction", "right")
    .limit(400)
  if (swipeError) {
    console.warn("job_swipes:", swipeError.message)
    return
  }

  const offsets = [26, 23, 20, 17, 14, 11, 8, 5, 3, 1]
  let updated = 0
  for (const [index, swipe] of (swipes || []).entries()) {
    const { error } = await sb.from("job_swipes").update({ created_at: daysAgo(offsets[index % offsets.length]) }).eq("id", swipe.id)
    if (!error) updated += 1
  }
  console.log("applications spread", updated)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
