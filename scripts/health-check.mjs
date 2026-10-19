import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.join(__dirname, "../.env.local")
const env = Object.fromEntries(
  fs
    .readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=")
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    }),
)

const url = (env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "")
const key = env.SUPABASE_SERVICE_ROLE_KEY
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const results = []

async function check(name, fn) {
  const started = Date.now()
  try {
    const detail = await fn()
    results.push({ name, ok: true, ms: Date.now() - started, detail })
  } catch (e) {
    results.push({ name, ok: false, ms: Date.now() - started, detail: String(e?.message || e) })
  }
}

async function rest(pathname, init = {}) {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), 20000)
  try {
    const res = await fetch(`${url}${pathname}`, {
      ...init,
      signal: controller.signal,
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
        ...(init.headers || {}),
      },
    })
    const text = await res.text()
    let json
    try {
      json = text ? JSON.parse(text) : null
    } catch {
      json = { raw: text.slice(0, 180) }
    }
    if (!res.ok) throw new Error(`${res.status} ${typeof json === "object" ? JSON.stringify(json).slice(0, 180) : text.slice(0, 180)}`)
    return json
  } finally {
    clearTimeout(t)
  }
}

function fileExists(rel) {
  return fs.existsSync(path.join(__dirname, "..", rel))
}

await check("env.supabase_url", async () => {
  if (!url) throw new Error("missing NEXT_PUBLIC_SUPABASE_URL")
  return url
})
await check("env.service_role", async () => {
  if (!key) throw new Error("missing SUPABASE_SERVICE_ROLE_KEY")
  return `len=${key.length}`
})
await check("env.anon_key", async () => {
  if (!anon) throw new Error("missing NEXT_PUBLIC_SUPABASE_ANON_KEY")
  return `len=${anon.length}`
})

await check("rest.profiles", async () => {
  const rows = await rest("/rest/v1/profiles?select=id,role&limit=3")
  return { count: rows.length, sampleRoles: rows.map((r) => r.role) }
})

await check("rest.admin_profile", async () => {
  const rows = await rest("/rest/v1/profiles?role=eq.admin&select=id,full_name,role")
  if (!rows.length) throw new Error("no admin profile")
  return rows[0]
})

await check("rest.platform_staff", async () => {
  const rows = await rest("/rest/v1/platform_staff?select=user_id,staff_role,modules&limit=10")
  return rows
})

await check("rest.recruiters", async () => {
  const rows = await rest("/rest/v1/recruiter_profiles?select=id,company_name,is_approved&order=created_at.desc&limit=50")
  const pending = rows.filter((r) => !r.is_approved)
  return { total: rows.length, pending: pending.length, pendingIds: pending.map((r) => r.id) }
})

await check("rest.jobs", async () => {
  const rows = await rest("/rest/v1/jobs?select=id,is_active,recruiter_id&limit=20")
  return { total: rows.length, active: rows.filter((r) => r.is_active).length }
})

await check("rest.students", async () => {
  const rows = await rest("/rest/v1/student_profiles?select=id&limit=5")
  return { sample: rows.length }
})

await check("auth.admin_user", async () => {
  const admin = (await rest("/rest/v1/profiles?role=eq.admin&select=id"))[0]
  if (!admin) throw new Error("no admin")
  const user = await rest(`/auth/v1/admin/users/${admin.id}`)
  return { id: user.id, email: user.email, confirmed: Boolean(user.email_confirmed_at) }
})

const criticalFiles = [
  "app/api/admin/employers/route.ts",
  "components/admin/AdminActions.tsx",
  "lib/nav/app-shell-user.ts",
  "lib/admin/access.ts",
  "app/(main)/dashboard/page.tsx",
  "app/(main)/admin/employers/page.tsx",
  "components/ui/button.tsx",
  "middleware.ts",
]

for (const f of criticalFiles) {
  await check(`file.${f}`, async () => {
    if (!fileExists(f)) throw new Error("missing")
    return "present"
  })
}

// Approve API source sanity
await check("code.approve_uses_service_role", async () => {
  const src = fs.readFileSync(path.join(__dirname, "../app/api/admin/employers/route.ts"), "utf8")
  if (!src.includes("createAdminClient")) throw new Error("missing createAdminClient")
  if (!src.includes("is_approved")) throw new Error("missing is_approved update")
  return "ok"
})

await check("code.button_loading_prop", async () => {
  const src = fs.readFileSync(path.join(__dirname, "../components/ui/button.tsx"), "utf8")
  if (!src.includes("loading?")) throw new Error("no loading prop")
  return "ok"
})

await check("code.getRequestUser_cache", async () => {
  const src = fs.readFileSync(path.join(__dirname, "../lib/nav/app-shell-user.ts"), "utf8")
  if (!src.includes("export const getRequestUser")) throw new Error("missing getRequestUser")
  return "ok"
})

// Sibling apps
const root = path.join(__dirname, "../..")
await check("sibling.pilot-portal", async () => {
  const pkg = path.join(root, "pilot-portal/package.json")
  if (!fs.existsSync(pkg)) throw new Error("missing")
  const envLocal = path.join(root, "pilot-portal/.env.local")
  return { package: true, envLocal: fs.existsSync(envLocal) }
})
await check("sibling.Job-Match", async () => {
  const pkg = path.join(root, "Job-Match/package.json")
  if (!fs.existsSync(pkg)) throw new Error("missing")
  const shell = path.join(root, "Job-Match/lib/nav/app-shell-user.ts")
  const src = fs.readFileSync(shell, "utf8")
  return { package: true, getRequestUser: src.includes("getRequestUser") }
})

console.log(JSON.stringify({ url, results }, null, 2))
const failed = results.filter((r) => !r.ok)
process.exit(failed.length ? 1 : 0)
