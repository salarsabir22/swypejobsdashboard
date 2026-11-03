import { createClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const service = process.env.SUPABASE_SERVICE_ROLE_KEY
const sb = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } })
const auth = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } })
const UNI = "Institute of Business Management (IoBM), Karachi"
const roles = ["director", "advisor", "coordinator", "dean", "faculty", "auditor", "mentor", "staff", "admin"]

const { data: fac } = await sb.from("campus_staff").select("user_id, staff_role, university").eq("university", UNI)
console.log("existing campus_staff roles", [...new Set((fac || []).map((r) => r.staff_role))])

const { data: row } = await sb.from("campus_staff").select("user_id, staff_role").eq("staff_role", "advisor").limit(1).maybeSingle()
if (row) {
  for (const role of roles) {
    const upd = await sb.from("campus_staff").update({ staff_role: role }).eq("user_id", row.user_id)
    console.log("try", role, upd.error ? upd.error.message : "OK")
    if (!upd.error) await sb.from("campus_staff").update({ staff_role: "advisor" }).eq("user_id", row.user_id)
  }
}

const invites = await sb
  .from("employer_invitations")
  .select("company_name, university, contact_email, created_at")
  .eq("contact_email", "rbac-probe@example.com")
  .order("created_at", { ascending: false })
  .limit(5)
console.log("invites", invites.data || invites.error)
if (invites.data?.length) {
  await sb.from("employer_invitations").delete().eq("contact_email", "rbac-probe@example.com")
  console.log("deleted probe invites", invites.data.length)
}

const signed = await auth.auth.signInWithPassword({ email: "cdc.test@iobm.edu.pk", password: "Swypejobs-Test-2026!" })
const session = signed.data.session
const ref = new URL(url).hostname.split(".")[0]
const raw = "base64-" + Buffer.from(JSON.stringify(session), "utf8").toString("base64url")
const cookie = `sb-${ref}-auth-token=${raw}`
const res = await fetch("http://localhost:3000/campus?campus=Some%20Other%20University", {
  headers: { cookie, accept: "text/html" },
  redirect: "manual",
})
const html = await res.text()
const withoutLinks = html.replace(/href="[^"]*"/g, " ")
const text = withoutLinks
  .replace(/<script[\s\S]*?<\/script>/gi, " ")
  .replace(/<style[\s\S]*?<\/style>/gi, " ")
  .replace(/<[^>]+>/g, " ")
  .replace(/\s+/g, " ")
console.log("status", res.status)
console.log("has IoBM visible", /Institute of Business Management/i.test(text))
console.log("has Some Other visible", /Some Other University/i.test(text))
console.log("has Some Other in raw html", /Some Other University/i.test(html))
const idx = text.search(/CDC Super Admin|Career office|Institute of Business Management/i)
console.log("label snippet", text.slice(Math.max(0, idx), Math.max(0, idx) + 180))
