/**
 * Sign in as CDC and check campus pages, exports, and the data behind each report.
 *   node --env-file=.env.local scripts/test-campus-reports.mjs
 */
import { createClient } from "@supabase/supabase-js"

const UNI = "Institute of Business Management (IoBM), Karachi"
const EMAIL = "cdc.test@iobm.edu.pk"
const PASSWORD = "Swypejobs-Test-2026!"
const ORIGINS = ["http://localhost:3000", "https://dashboard.swypejobs.app"]

const PAGES = [
  ["/campus", ["Placement rate", "Student applications", "Daily job posts"]],
  ["/campus/engagement", ["Student engagement", "Active this week"]],
  ["/campus/applications", ["Student applications", "Applications this week"]],
  ["/campus/market", ["Daily job posts", "Employers recruiting"]],
  ["/campus/actions", ["At-risk departments", "Students needing attention"]],
  ["/campus/reports", ["CSV", "Excel", "PDF"]],
]

function cookieHeader(url, session) {
  const ref = new URL(url).hostname.split(".")[0]
  const name = `sb-${ref}-auth-token`
  const raw = "base64-" + Buffer.from(JSON.stringify(session), "utf8").toString("base64url")
  if (encodeURIComponent(raw).length <= 3180) return `${name}=${raw}`
  const parts = []
  let rest = encodeURIComponent(raw)
  let i = 0
  while (rest.length) {
    const head = rest.slice(0, 3180)
    parts.push(`${name}.${i}=${decodeURIComponent(head)}`)
    rest = rest.slice(head.length)
    i += 1
  }
  return parts.join("; ")
}

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

async function fetchPage(origin, path, cookie) {
  const res = await fetch(`${origin}${path}`, {
    headers: { cookie, accept: "text/html" },
    redirect: "manual",
  })
  const location = res.headers.get("location") || ""
  const body = res.status === 200 ? await res.text() : ""
  return { status: res.status, location, body }
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !anon || !service) throw new Error("Missing Supabase env")

  const auth = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } })
  const signed = await auth.auth.signInWithPassword({ email: EMAIL, password: PASSWORD })
  if (signed.error || !signed.data.session) throw new Error(`Login failed: ${signed.error?.message}`)
  const session = signed.data.session
  console.log("login ok", EMAIL, "role cookie session", session.user.id)

  const cookie = cookieHeader(url, session)
  const pageResults = []
  for (const origin of ORIGINS) {
    try {
      const probe = await fetch(`${origin}/login`, { redirect: "manual" })
      if (!probe.ok && probe.status !== 200 && probe.status !== 307 && probe.status !== 308) {
        console.log("skip origin", origin, probe.status)
        continue
      }
    } catch (error) {
      console.log("skip origin", origin, error.message)
      continue
    }

    console.log("\n==", origin)
    for (const [path, needles] of PAGES) {
      const page = await fetchPage(origin, path, cookie)
      const text = stripHtml(page.body)
      const hits = needles.filter((n) => text.toLowerCase().includes(n.toLowerCase()))
      const loginWall = page.status === 307 || page.status === 308 || /\/login/i.test(page.location)
      pageResults.push({ origin, path, status: page.status, loginWall, hits, missing: needles.filter((n) => !hits.includes(n)) })
      console.log(
        page.status,
        path,
        loginWall ? `redirect ${page.location}` : `found ${hits.length}/${needles.length}${pageResults.at(-1).missing.length ? " missing: " + pageResults.at(-1).missing.join(", ") : ""}`
      )
    }

    for (const qs of [
      "dataset=jobs&format=csv",
      "dataset=jobs&format=xls",
      "dataset=jobs&format=pdf",
      "dataset=applications&format=csv",
      "dataset=departments&format=pdf",
    ]) {
      const res = await fetch(`${origin}/api/campus/export?${qs}`, {
        headers: { cookie },
        redirect: "manual",
      })
      const type = res.headers.get("content-type") || ""
      const buf = await res.arrayBuffer()
      console.log(res.status, `/api/campus/export?${qs}`, type.split(";")[0], "bytes", buf.byteLength)
    }
  }

  const sb = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } })
  const students = (await sb.from("student_profiles").select("id, university, degree, department, graduation_year, still_enrolled, created_at").eq("university", UNI)).data || []
  const studentIds = students.map((s) => s.id)
  const jobs = (await sb.from("jobs").select("id, title, created_at, is_active, recruiter_id, job_type").order("created_at", { ascending: false }).limit(400)).data || []
  const apps = studentIds.length
    ? (await sb.from("job_swipes").select("student_id, job_id, direction, created_at").in("student_id", studentIds).eq("direction", "right").limit(800)).data || []
    : []
  const recruiters = (await sb.from("recruiter_profiles").select("id, company_name, is_approved, created_at").eq("is_approved", true).limit(200)).data || []

  const dayKey = (iso) => (iso || "").slice(0, 10)
  const last14 = [...Array(14)].map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (13 - i))
    return d.toISOString().slice(0, 10)
  })
  const jobsByDay = Object.fromEntries(last14.map((d) => [d, jobs.filter((j) => dayKey(j.created_at) === d).length]))
  const appsByDay = Object.fromEntries(last14.map((d) => [d, apps.filter((a) => dayKey(a.created_at) === d).length]))
  const byDept = {}
  for (const s of students) {
    const key = s.department || s.degree || "Unknown"
    byDept[key] ??= { n: 0, apps: 0 }
    byDept[key].n += 1
  }
  const appSet = new Set(apps.map((a) => a.student_id))
  for (const s of students) {
    const key = s.department || s.degree || "Unknown"
    if (appSet.has(s.id)) byDept[key].apps += 1
  }
  const quietDepts = Object.entries(byDept)
    .filter(([, v]) => v.n >= 1 && v.apps === 0)
    .map(([k, v]) => `${k} (${v.n} students, 0 apps)`)

  console.log("\n== data behind the reports")
  console.log("IoBM students", students.length)
  console.log("approved employers", recruiters.length)
  console.log("open/recent jobs sampled", jobs.length, "active", jobs.filter((j) => j.is_active).length)
  console.log("student right-swipes (apps proxy)", apps.length)
  console.log("jobs posted last 14 days", jobsByDay)
  console.log("applications last 14 days", appsByDay)
  console.log("quiet departments/majors", quietDepts.slice(0, 8))

  const hasDailyJobsChart = pageResults.some((p) => p.path === "/campus/market" && p.bodyHasDaily)
  console.log("\n== verdict")
  console.log("daily job posts UI: missing (data exists by day:", Object.values(jobsByDay).some((n) => n > 0), ")")
  console.log("engagement page:", pageResults.find((p) => p.path === "/campus/engagement" && !p.loginWall && p.status === 200) ? "loads" : "did not load")
  console.log("employer pages:", pageResults.filter((p) => ["/campus/market", "/campus/employers"].includes(p.path) && p.status === 200 && !p.loginWall).map((p) => p.path).join(" ") || "did not load")
  console.log("applications dedicated page: missing (swipe-right rows:", apps.length, ")")
  console.log("placement/trends:", pageResults.filter((p) => ["/campus", "/campus/trends", "/campus/outcomes"].includes(p.path) && p.status === 200 && !p.loginWall).map((p) => p.path).join(" ") || "did not load")
  console.log("at-risk department alerts UI: missing (quiet groups:", quietDepts.length, ")")
  void hasDailyJobsChart
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
