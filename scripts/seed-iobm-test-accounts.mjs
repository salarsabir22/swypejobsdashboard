/**
 * One password-login test account per IoBM / app role.
 *
 *   node --env-file=.env.local scripts/seed-iobm-test-accounts.mjs
 */
import { createClient } from "@supabase/supabase-js"

const UNI = "Institute of Business Management (IoBM), Karachi"
const PASSWORD = "Swypejobs-Test-2026!"

const ACCOUNTS = [
  {
    email: "student.test@iobm.edu.pk",
    fullName: "Ayesha Student",
    role: "student",
    portal: "student",
  },
  {
    email: "alumni.test@iobm.edu.pk",
    fullName: "Hamza Alumni",
    role: "student",
    portal: "alumni",
  },
  {
    email: "cdc.test@iobm.edu.pk",
    fullName: "Sara CDC Director",
    role: "university",
    portal: "faculty",
    staffRole: "director",
  },
  {
    email: "faculty.test@iobm.edu.pk",
    fullName: "Omar Faculty",
    role: "university",
    portal: "faculty",
    staffRole: "advisor",
  },
  {
    email: "employer.test@swypejobs.dev",
    fullName: "Nadia Recruiter",
    role: "recruiter",
    portal: "employer",
    company: "Unilever Pakistan",
  },
]

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

async function findUserId(sb, email, fullName) {
  const created = await sb.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  })
  if (!created.error && created.data.user?.id) return created.data.user.id
  if (created.error && !/already|registered|exists/i.test(created.error.message)) {
    throw new Error(`${email}: ${created.error.message}`)
  }

  const link = await sb.auth.admin.generateLink({ type: "magiclink", email })
  if (link.data?.user?.id) return link.data.user.id

  const named = await sb.from("profiles").select("id").eq("full_name", fullName).maybeSingle()
  if (named.data?.id) return named.data.id

  throw new Error(`${email}: exists but could not be loaded (${created.error?.message || "no id"})`)
}

async function upsertStudent(sb, userId) {
  const row = {
    id: userId,
    university: UNI,
    degree: null,
    graduation_year: null,
    still_enrolled: null,
    current_semester: null,
    skills: [],
    preferred_job_categories: [],
    linkedin_url: null,
    github_url: null,
    portfolio_url: null,
    resume_url: null,
  }
  let { error } = await sb.from("student_profiles").upsert(row, { onConflict: "id" })
  if (error && /still_enrolled|current_semester/i.test(error.message)) {
    delete row.still_enrolled
    delete row.current_semester
    ;({ error } = await sb.from("student_profiles").upsert(row, { onConflict: "id" }))
  }
  if (error) throw new Error(`student_profiles: ${error.message}`)
}

async function main() {
  const sb = admin()
  const results = []

  for (const account of ACCOUNTS) {
    const userId = await findUserId(sb, account.email, account.fullName)
    const metadata = {
      full_name: account.fullName,
      role: account.role,
      university: UNI,
      sso: "iobm",
      portal: account.portal,
      alumni: account.portal === "alumni",
      staff_role: account.staffRole || null,
    }
    const updated = await sb.auth.admin.updateUserById(userId, {
      password: PASSWORD,
      email_confirm: true,
      user_metadata: metadata,
      app_metadata: { sso: "iobm", sso_status: "active" },
    })
    if (updated.error) throw new Error(`${account.email}: ${updated.error.message}`)

    const profile = await sb.from("profiles").upsert(
      { id: userId, role: account.role, full_name: account.fullName, bio: null, avatar_url: null },
      { onConflict: "id" }
    )
    if (profile.error) {
      const retry = await sb.from("profiles").upsert(
        { id: userId, role: account.role, full_name: account.fullName, bio: null, avatar_url: null },
        { onConflict: "id" }
      )
      if (retry.error) throw new Error(`profiles ${account.email}: ${retry.error.message}`)
    }

    if (account.role === "student") {
      await sb.from("campus_staff").delete().eq("user_id", userId)
      await upsertStudent(sb, userId)
    }

    if (account.role === "university") {
      await sb.from("student_profiles").delete().eq("id", userId)
      const staff = { user_id: userId, university: UNI, staff_role: account.staffRole }
      const inserted = await sb.from("campus_staff").upsert(staff, { onConflict: "user_id" })
      if (inserted.error) {
        await sb.from("campus_staff").delete().eq("user_id", userId)
        const retry = await sb.from("campus_staff").insert(staff)
        if (retry.error) throw new Error(`campus_staff ${account.email}: ${retry.error.message}`)
      }
    }

    if (account.role === "recruiter") {
      await sb.from("campus_staff").delete().eq("user_id", userId)
      const recruiter = {
        id: userId,
        company_name: "",
        description: "",
        hiring_focus: "",
        website_url: null,
        industry: null,
        employee_count: null,
        is_approved: false,
      }
      let { error } = await sb.from("recruiter_profiles").upsert(recruiter, { onConflict: "id" })
      if (error) {
        recruiter.company_name = "My company"
        ;({ error } = await sb.from("recruiter_profiles").upsert(recruiter, { onConflict: "id" }))
      }
      if (error) throw new Error(`recruiter_profiles: ${error.message}`)
      const partner = await sb.from("campus_employer_partners").upsert(
        { university: UNI, recruiter_id: userId, tier: "preferred", notes: "IoBM test employer" },
        { onConflict: "university,recruiter_id" }
      )
      if (partner.error) {
        console.warn("campus_employer_partners skipped:", partner.error.message)
      }
    }

    results.push({ role: account.portal, email: account.email, name: account.fullName, userId })
    console.log("ok", account.email, account.role, account.staffRole || account.portal)
  }

  console.log("\nPassword for every account:")
  console.log(PASSWORD)
  console.log("\nLog in at /login (or /iobm then continue with email if shown)\n")
  for (const row of results) {
    console.log(`${row.role.padEnd(10)}  ${row.email}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
