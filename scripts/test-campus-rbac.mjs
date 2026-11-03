/**
 * Sign in as each test role and check campus page + API enforcement.
 *   node --env-file=.env.local scripts/test-campus-rbac.mjs
 */
import { createClient } from "@supabase/supabase-js"

const UNI = "Institute of Business Management (IoBM), Karachi"
const PASSWORD = "Swypejobs-Test-2026!"
const ORIGINS = ["http://localhost:3000"]

const ACCOUNTS = [
  { id: "cdc", email: "cdc.test@iobm.edu.pk" },
  { id: "faculty-account", email: "faculty.test@iobm.edu.pk" },
  { id: "student", email: "student.test@iobm.edu.pk" },
  { id: "alumni", email: "alumni.test@iobm.edu.pk" },
  { id: "employer", email: "employer.test@swypejobs.dev" },
]

const PAGES = [
  "/campus",
  "/campus/appointments",
  "/campus/events",
  "/campus/reports",
  "/campus/applications",
  "/campus/equity",
  "/campus/actions",
  "/campus/sso",
  "/campus?campus=Some%20Other%20University",
]

const EXPECT = {
  director: {
    "/campus": 200,
    "/campus/appointments": 200,
    "/campus/events": 200,
    "/campus/reports": 200,
    "/campus/applications": 200,
    "/campus/equity": 200,
    "/campus/actions": 200,
    "/campus/sso": 200,
    "/campus?campus=Some%20Other%20University": 200,
    export: 200,
    mutate: 200,
    advisingGet: 200,
  },
  advisor: {
    "/campus": 200,
    "/campus/appointments": 200,
    "/campus/events": 200,
    "/campus/reports": 200,
    "/campus/applications": 200,
    "/campus/equity": 200,
    "/campus/actions": 200,
    "/campus/sso": 200,
    "/campus?campus=Some%20Other%20University": 200,
    export: 200,
    mutate: 200,
    advisingGet: 200,
  },
  faculty: {
    "/campus": 200,
    "/campus/appointments": 200,
    "/campus/events": 200,
    "/campus/reports": "home",
    "/campus/applications": "home",
    "/campus/equity": "home",
    "/campus/actions": "home",
    "/campus/sso": "home",
    "/campus?campus=Some%20Other%20University": 200,
    export: 403,
    mutate: 403,
    advisingGet: 200,
  },
  auditor: {
    "/campus": 200,
    "/campus/appointments": "home",
    "/campus/events": "home",
    "/campus/reports": 200,
    "/campus/applications": 200,
    "/campus/equity": 200,
    "/campus/actions": "home",
    "/campus/sso": "home",
    "/campus?campus=Some%20Other%20University": 200,
    export: 200,
    mutate: 403,
    advisingGet: 403,
  },
  outsider: {
    "/campus": "away",
    "/campus/appointments": "away",
    "/campus/events": "away",
    "/campus/reports": "away",
    "/campus/applications": "away",
    "/campus/equity": "away",
    "/campus/actions": "away",
    "/campus/sso": "away",
    "/campus?campus=Some%20Other%20University": "away",
    export: 403,
    mutate: 403,
    advisingGet: 403,
  },
}

function cookieHeader(supabaseUrl, session) {
  const ref = new URL(supabaseUrl).hostname.split(".")[0]
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

function classify(page) {
  if (page.status === 200) return 200
  if (page.status === 307 || page.status === 308 || page.status === 302) {
    try {
      const path = new URL(page.location, "http://localhost:3000").pathname
      if (path === "/campus") return "home"
      return "away"
    } catch {
      return "away"
    }
  }
  return page.status
}

async function request(url, init = {}, tries = 4) {
  let lastError
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { ...init, redirect: "manual" })
      const location = res.headers.get("location") || ""
      const type = res.headers.get("content-type") || ""
      const body = await res.text()
      return { status: res.status, location, type, body }
    } catch (error) {
      lastError = error
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)))
    }
  }
  throw lastError
}

async function fetchPage(origin, path, cookie) {
  const res = await request(`${origin}${path}`, { headers: { cookie, accept: "text/html" } })
  return { status: res.status, location: res.location, body: res.status === 200 ? res.body : "" }
}

async function api(origin, path, cookie, init = {}) {
  const res = await request(`${origin}${path}`, {
    ...init,
    headers: { cookie, accept: "application/json", ...(init.headers || {}) },
  })
  return { status: res.status, type: res.type, body: res.body.slice(0, 240), location: res.location }
}

function strip(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

async function waitForOrigin(origin, tries = 40) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(`${origin}/login`, { redirect: "manual" })
      if (res.status === 200 || res.status === 307 || res.status === 308) return true
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 1500))
  }
  return false
}

async function runRole(origin, cookie, expected, label) {
  const rows = []
  for (const path of PAGES) {
    const page = await fetchPage(origin, path, cookie)
    const got = classify(page)
    const want = expected[path]
    const text = strip(page.body.replace(/href="[^"]*"/g, " ")).slice(0, 180)
    const otherCampus = path.includes("campus=")
    const visible = page.body.replace(/href="[^"]*"/g, " ")
    const leaked = otherCampus && page.status === 200 && /Some Other University/i.test(visible)
    const ok = got === want && !leaked
    rows.push({
      check: path,
      want,
      got: leaked ? `${got} leaked other campus` : got,
      ok,
      extra: page.location || (page.status === 200 ? text.slice(0, 80) : ""),
    })
  }

  const exp = await api(origin, "/api/campus/export?dataset=overview&format=csv", cookie)
  rows.push({ check: "GET export", want: expected.export, got: exp.status, ok: exp.status === expected.export, extra: exp.body.slice(0, 80) })

  const idor = await api(origin, "/api/campus/export?dataset=overview&format=csv&campus=Some%20Other%20University", cookie)
  const idorBody = idor.body + idor.type
  const leakedExport = expected.export === 200 && idor.status === 200 && /Some Other University/i.test(idorBody)
  rows.push({
    check: "GET export ?campus=other",
    want: expected.export,
    got: leakedExport ? `${idor.status} leaked` : idor.status,
    ok: idor.status === expected.export && !leakedExport,
    extra: idor.body.slice(0, 80),
  })

  const advising = await api(origin, "/api/campus/appointments", cookie)
  rows.push({ check: "GET appointments", want: expected.advisingGet, got: advising.status, ok: advising.status === expected.advisingGet, extra: advising.body.slice(0, 80) })

  const patch = await api(origin, "/api/campus/appointments", cookie, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: "00000000-0000-0000-0000-000000000000", status: "confirmed" }),
  })
  const mutateOk = expected.mutate === 200 ? [200, 400, 404].includes(patch.status) : patch.status === expected.mutate
  rows.push({
    check: "PATCH appointments",
    want: expected.mutate === 200 ? "200/400/404" : expected.mutate,
    got: patch.status,
    ok: mutateOk,
    extra: patch.body.slice(0, 80),
  })

  const invite = await api(origin, "/api/campus/employer-invites", cookie, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      companyName: "RBAC Probe Co",
      contactEmail: "rbac-probe@example.com",
      university: "Some Other University",
    }),
  })
  const inviteOk = expected.mutate === 200 ? [200, 400, 500].includes(invite.status) : invite.status === expected.mutate
  rows.push({
    check: "POST employer-invite other uni",
    want: expected.mutate === 200 ? "200/400/500 locked to own campus" : expected.mutate,
    got: invite.status,
    ok: inviteOk,
    extra: invite.body.slice(0, 120),
  })

  console.log(`\n== ${label}`)
  for (const row of rows) {
    console.log(`${row.ok ? "PASS" : "FAIL"}  ${row.check.padEnd(42)} want ${String(row.want).padEnd(16)} got ${row.got}${row.ok ? "" : "  " + row.extra}`)
  }
  return rows
}

async function setStaffRole(sb, userId, staffRole) {
  const updated = await sb.from("campus_staff").update({ staff_role: staffRole }).eq("user_id", userId).select("staff_role").maybeSingle()
  return { role: updated.data?.staff_role, error: updated.error?.message || null }
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !anon || !service) throw new Error("Missing Supabase env")

  const origin = ORIGINS[0]
  const up = await waitForOrigin(origin, 40)
  if (!up) throw new Error(`${origin} is not responding`)

  const auth = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } })
  const sb = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } })

  console.log("unsigned export")
  const unsigned = await api(origin, "/api/campus/export?dataset=overview&format=csv", "")
  console.log(`${unsigned.status === 401 ? "PASS" : "FAIL"}  unsigned export want 401 got ${unsigned.status} ${unsigned.body.slice(0, 80)}`)

  const all = []
  const staffByEmail = {}
  for (const account of ACCOUNTS) {
    const signed = await auth.auth.signInWithPassword({ email: account.email, password: PASSWORD })
    if (signed.error || !signed.data.session) {
      console.log("FAIL  login", account.email, signed.error?.message)
      continue
    }
    const userId = signed.data.user.id
    const profile = await sb.from("profiles").select("role").eq("id", userId).maybeSingle()
    const staff = await sb.from("campus_staff").select("university, staff_role").eq("user_id", userId).maybeSingle()
    staffByEmail[account.email] = { userId, profile: profile.data?.role, staff: staff.data }
    console.log("login", account.email, "profile", profile.data?.role, "staff", staff.data?.staff_role || "none", staff.data?.university || "")
    const cookie = cookieHeader(url, signed.data.session)
    const expectedKey = account.id === "cdc" ? "director" : account.id === "faculty-account" ? (staff.data?.staff_role === "faculty" ? "faculty" : staff.data?.staff_role === "auditor" ? "auditor" : "advisor") : "outsider"
    const rows = await runRole(origin, cookie, EXPECT[expectedKey], `${account.email} as ${expectedKey}`)
    all.push(...rows.map((r) => ({ account: account.email, role: expectedKey, ...r })))
  }

  const faculty = staffByEmail["faculty.test@iobm.edu.pk"]
  if (faculty?.userId) {
    const original = faculty.staff?.staff_role || "advisor"
    try {
      for (const scoped of ["faculty", "auditor"]) {
        const set = await setStaffRole(sb, faculty.userId, scoped)
        console.log("\nset faculty.test staff_role ->", scoped, set.role || set.error)
        if (set.error || set.role !== scoped) {
          all.push({ account: "faculty.test@iobm.edu.pk", role: scoped, check: `set staff_role=${scoped}`, want: scoped, got: set.error || set.role, ok: false, extra: "" })
          continue
        }
        const signed = await auth.auth.signInWithPassword({ email: "faculty.test@iobm.edu.pk", password: PASSWORD })
        const cookie = cookieHeader(url, signed.data.session)
        const rows = await runRole(origin, cookie, EXPECT[scoped], `faculty.test@iobm.edu.pk as ${scoped}`)
        all.push(...rows.map((r) => ({ account: "faculty.test@iobm.edu.pk", role: scoped, ...r })))
      }
    } finally {
      const restored = await setStaffRole(sb, faculty.userId, original)
      console.log("restored faculty.test staff_role ->", restored.role || restored.error)
    }
  }

  const failed = all.filter((r) => !r.ok)
  console.log("\n== verdict")
  console.log("checks", all.length, "passed", all.length - failed.length, "failed", failed.length)
  if (failed.length) {
    for (const row of failed) console.log("FAIL", row.account, row.role, row.check, "want", row.want, "got", row.got)
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
