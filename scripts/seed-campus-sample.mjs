#!/usr/bin/env node
/**
 * Seed sample campus data for CDC QA: 50 students, 50 employers, 50 alumni.
 *
 *   npm run seed:sample            # dry run, prints what would be created
 *   npm run seed:sample:confirm    # writes to Supabase
 *   npm run seed:sample:clean      # dry run removal of sample accounts
 *   npm run seed:sample:clean:confirm
 *
 * Uses the service role key, so it bypasses RLS. Every account is created with a
 * confirmed email at @example.com and a `seed: "campus-sample"` metadata marker.
 * Re-running is safe: accounts are matched by email and profile rows are upserted.
 *
 * University defaults to the IoBM campus name used by SSO; override with SEED_UNIVERSITY.
 */

import { createClient } from "@supabase/supabase-js"

const SAMPLE_DOMAIN = "example.com"
const SAMPLE_PASSWORD = "Sample!Pass1234"
const SAMPLE_MARKER = "campus-sample"
const UNIVERSITY = process.env.SEED_UNIVERSITY || "Institute of Business Management (IoBM), Karachi"
const COUNT = 50

const args = new Set(process.argv.slice(2))
const CONFIRM = args.has("--confirm")
const CLEAN = args.has("--clean")

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Run with: node --env-file=.env.local ...")
  process.exit(1)
}

const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

const FIRST_NAMES = [
  "Ayesha", "Bilal", "Hira", "Usman", "Zainab", "Hamza", "Fatima", "Ali", "Sana", "Omar",
  "Maryam", "Danish", "Noor", "Kashif", "Iqra", "Ahmed", "Rabia", "Talha", "Mehwish", "Faisal",
  "Areeba", "Shahzaib", "Anum", "Saad", "Laiba", "Rayan", "Mahnoor", "Zohaib", "Kiran", "Arsalan",
  "Eman", "Junaid", "Sehar", "Waleed", "Aiman", "Haris", "Nimra", "Adnan", "Sadia", "Umair",
  "Rida", "Kamran", "Hafsa", "Noman", "Sahar", "Taimoor", "Aleena", "Moiz", "Iman", "Sufyan",
]

const LAST_NAMES = [
  "Khan", "Ahmed", "Siddiqui", "Malik", "Sheikh", "Qureshi", "Javed", "Hussain", "Raza", "Farooqui",
  "Abbasi", "Baig", "Chaudhry", "Dar", "Gilani", "Hashmi", "Iqbal", "Jamali", "Karim", "Latif",
  "Mirza", "Nadeem", "Osmani", "Pirzada", "Rehman", "Sattar", "Tariq", "Usmani", "Warsi", "Yousuf",
]

const PROGRAMS = [
  { degree: "BBA", skills: ["Excel", "Communication", "Market Research", "PowerPoint"], categories: ["Marketing", "Sales", "Operations"] },
  { degree: "MBA", skills: ["Strategy", "Financial Analysis", "Leadership", "Excel"], categories: ["Consulting", "Finance", "Operations"] },
  { degree: "BS Accounting & Finance", skills: ["Accounting", "Excel", "Financial Modeling", "Audit"], categories: ["Finance", "Consulting"] },
  { degree: "BS Computer Science", skills: ["TypeScript", "React", "SQL", "Git"], categories: ["Software Engineering", "Data Science"] },
  { degree: "BS Software Engineering", skills: ["JavaScript", "Node.js", "Testing", "Docker"], categories: ["Software Engineering", "Product Management"] },
  { degree: "BS Economics", skills: ["Econometrics", "Stata", "Excel", "Research"], categories: ["Finance", "Data Science", "Consulting"] },
  { degree: "BS Data Science", skills: ["Python", "pandas", "SQL", "Machine Learning"], categories: ["Data Science", "Software Engineering"] },
  { degree: "BS Media Studies", skills: ["Copywriting", "Social Media", "Video Editing", "SEO"], categories: ["Marketing", "Design"] },
  { degree: "BE Electrical", skills: ["MATLAB", "Circuit Design", "Python", "Project Management"], categories: ["Operations", "Software Engineering"] },
  { degree: "BE Industrial", skills: ["Lean", "Supply Chain", "Excel", "Process Mapping"], categories: ["Operations", "Consulting"] },
]

const INDUSTRIES = [
  "Software", "Banking", "FMCG", "Telecom", "Consulting", "Textiles", "Pharmaceuticals",
  "Logistics", "E-commerce", "Media", "Insurance", "Energy", "Retail", "Fintech", "Automotive",
]

const COMPANY_STEMS = [
  "Systems", "Labs", "Group", "Industries", "Solutions", "Ventures", "Textiles", "Foods",
  "Bank", "Digital", "Logistics", "Pharma", "Media", "Retail", "Energy", "Motors", "Insight",
]

const SIZES = ["11-50", "51-200", "201-500", "501-1000", "1000+"]

const pad = (n) => String(n).padStart(2, "0")
const studentEmail = (i) => `sample.student${pad(i)}@${SAMPLE_DOMAIN}`
const alumniEmail = (i) => `sample.alumni${pad(i)}@${SAMPLE_DOMAIN}`
const employerEmail = (i) => `sample.employer${pad(i)}@${SAMPLE_DOMAIN}`

const nameFor = (offset, i) => {
  const first = FIRST_NAMES[(offset + i) % FIRST_NAMES.length]
  const last = LAST_NAMES[(offset * 3 + i * 7) % LAST_NAMES.length]
  return `${first} ${last}`
}

function studentRows() {
  const year = new Date().getFullYear()
  return Array.from({ length: COUNT }, (_, index) => {
    const i = index + 1
    const program = PROGRAMS[index % PROGRAMS.length]
    return {
      email: studentEmail(i),
      profile: { role: "student", full_name: nameFor(0, index) },
      student: {
        university: UNIVERSITY,
        degree: program.degree,
        graduation_year: year + (index % 3),
        institution_type: "IoBM",
        skills: program.skills,
        preferred_job_categories: program.categories,
        is_alumni: false,
      },
    }
  })
}

function alumniRows() {
  const year = new Date().getFullYear()
  return Array.from({ length: COUNT }, (_, index) => {
    const i = index + 1
    const program = PROGRAMS[(index + 4) % PROGRAMS.length]
    return {
      email: alumniEmail(i),
      profile: { role: "student", full_name: nameFor(7, index) },
      student: {
        university: UNIVERSITY,
        degree: program.degree,
        graduation_year: year - 1 - (index % 3),
        institution_type: "IoBM",
        skills: program.skills,
        preferred_job_categories: program.categories,
        is_alumni: true,
      },
    }
  })
}

function employerRows() {
  return Array.from({ length: COUNT }, (_, index) => {
    const i = index + 1
    const stem = COMPANY_STEMS[index % COMPANY_STEMS.length]
    const city = ["Karachi", "Lahore", "Islamabad"][index % 3]
    const company = `${LAST_NAMES[(index * 5) % LAST_NAMES.length]} ${stem} ${city}`
    const slug = company.toLowerCase().replace(/[^a-z0-9]+/g, "-")
    return {
      email: employerEmail(i),
      profile: { role: "recruiter", full_name: nameFor(13, index) },
      employer: {
        company_name: company,
        description: `${company} hires early-career talent from IoBM across ${INDUSTRIES[index % INDUSTRIES.length].toLowerCase()} roles.`,
        hiring_focus: `${PROGRAMS[index % PROGRAMS.length].degree} graduates, internships and entry-level roles.`,
        industry: INDUSTRIES[index % INDUSTRIES.length],
        employee_count: SIZES[index % SIZES.length],
        website_url: `https://${slug}.example.com`,
        is_approved: true,
      },
    }
  })
}

async function chunkedUpsert(table, rows, optionalKeys = []) {
  let written = 0
  for (let start = 0; start < rows.length; start += 100) {
    const batch = rows.slice(start, start + 100)
    let payload = batch
    let { error } = await admin.from(table).upsert(payload, { onConflict: "id" })
    if (error && optionalKeys.length) {
      const stripped = batch.map((row) => {
        const next = { ...row }
        for (const key of optionalKeys) delete next[key]
        return next
      })
      payload = stripped
      ;({ error } = await admin.from(table).upsert(payload, { onConflict: "id" }))
    }
    if (error) throw new Error(`${table}: ${error.message}`)
    written += batch.length
  }
  return written
}

async function existingUsersByEmail() {
  const map = new Map()
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw new Error(`listUsers: ${error.message}`)
    const users = data?.users || []
    for (const user of users) {
      if (user.email) map.set(user.email.toLowerCase(), user)
    }
    if (users.length < 1000) break
  }
  return map
}

async function ensureUser(email, fullName, role) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: SAMPLE_PASSWORD,
    email_confirm: true,
    user_metadata: { role, full_name: fullName, seed: SAMPLE_MARKER, university: role === "student" ? UNIVERSITY : undefined },
  })
  if (!error) return data.user.id
  if (/already|registered|exists/i.test(error.message)) return null
  throw new Error(`createUser ${email}: ${error.message}`)
}

async function seed() {
  const students = studentRows()
  const alumni = alumniRows()
  const employers = employerRows()

  console.log(`Campus: ${UNIVERSITY}`)
  console.log(`Plan: ${students.length} students, ${employers.length} employers, ${alumni.length} alumni`)

  if (!CONFIRM) {
    console.log("\nDry run only. Examples:")
    console.table([students[0].student, alumni[0].student, employers[0].employer])
    console.log("\nRe-run with --confirm (npm run seed:sample:confirm) to write.")
    return
  }

  const existing = await existingUsersByEmail()
  const ids = new Map()

  const plan = [
    ...students.map((row) => ({ ...row, kind: "student" })),
    ...alumni.map((row) => ({ ...row, kind: "alumni" })),
    ...employers.map((row) => ({ ...row, kind: "recruiter" })),
  ]

  let created = 0
  for (const row of plan) {
    const found = existing.get(row.email.toLowerCase())
    if (found) {
      ids.set(row.email, found.id)
      continue
    }
    const id = await ensureUser(row.email, row.profile.full_name, row.profile.role)
    if (id) {
      ids.set(row.email, id)
      created += 1
    }
  }
  // Second pass: a createUser race can return null; refresh the map for anything missing.
  const missing = plan.filter((row) => !ids.has(row.email))
  if (missing.length) {
    const refreshed = await existingUsersByEmail()
    for (const row of missing) {
      const found = refreshed.get(row.email.toLowerCase())
      if (found) ids.set(row.email, found.id)
    }
  }
  const unresolved = plan.filter((row) => !ids.has(row.email))
  if (unresolved.length) {
    throw new Error(`Could not resolve ${unresolved.length} accounts, first: ${unresolved[0].email}`)
  }

  const profileRows = plan.map((row) => ({ id: ids.get(row.email), ...row.profile }))
  const studentProfileRows = [...students, ...alumni].map((row) => ({ id: ids.get(row.email), ...row.student }))
  const recruiterProfileRows = employers.map((row) => ({ id: ids.get(row.email), ...row.employer }))

  const profileCount = await chunkedUpsert("profiles", profileRows)
  const studentCount = await chunkedUpsert("student_profiles", studentProfileRows, ["is_alumni", "institution_type"])
  const employerCount = await chunkedUpsert("recruiter_profiles", recruiterProfileRows, ["industry", "employee_count", "is_approved", "website_url"])

  console.log(`\nDone. Created ${created} new auth users.`)
  console.log(`Upserted ${profileCount} profiles, ${studentCount} student profiles (${alumni.length} alumni), ${employerCount} employer profiles.`)
  console.log(`Sign-in password for every sample account: ${SAMPLE_PASSWORD}`)
  console.log("Emails: sample.student01…50, sample.alumni01…50, sample.employer01…50 @example.com")
}

async function clean() {
  const users = await existingUsersByEmail()
  const pattern = /^sample\.(student|alumni|employer)\d{2}@example\.com$/i
  const targets = [...users.values()].filter((user) => user.email && pattern.test(user.email))
  console.log(`Found ${targets.length} sample accounts to remove.`)
  if (!targets.length) return
  if (!CONFIRM) {
    console.log("Dry run only. Re-run with --confirm (npm run seed:sample:clean:confirm) to delete.")
    return
  }
  for (const user of targets) {
    const { error } = await admin.auth.admin.deleteUser(user.id)
    if (error) throw new Error(`deleteUser ${user.email}: ${error.message}`)
  }
  console.log(`Deleted ${targets.length} sample accounts. Profiles and student/employer rows cascade with the user.`)
}

try {
  if (CLEAN) await clean()
  else await seed()
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
