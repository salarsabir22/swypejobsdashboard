/**
 * Complete profiles + dashboard activity for every IoBM test role.
 *
 *   node --env-file=.env.local scripts/seed-iobm-dashboard-data.mjs
 */
import { createClient } from "@supabase/supabase-js"

const UNI = "Institute of Business Management (IoBM), Karachi"
const PASSWORD = "Swypejobs-Test-2026!"

const ACCOUNTS = [
  { email: "student.test@iobm.edu.pk", fullName: "Ayesha Student", role: "student", portal: "student" },
  { email: "alumni.test@iobm.edu.pk", fullName: "Hamza Alumni", role: "student", portal: "alumni" },
  { email: "cdc.test@iobm.edu.pk", fullName: "Sara CDC Director", role: "university", portal: "faculty", staffRole: "director" },
  { email: "faculty.test@iobm.edu.pk", fullName: "Omar Faculty", role: "university", portal: "faculty", staffRole: "advisor" },
  { email: "dean.test@iobm.edu.pk", fullName: "Nida Dean", role: "university", portal: "faculty", staffRole: "dean" },
  { email: "employer.test@swypejobs.dev", fullName: "Nadia Recruiter", role: "recruiter", portal: "employer" },
]

const COHORT = [
  { email: "bilal.cs.test@iobm.edu.pk", fullName: "Bilal Khan", degree: "BS Computer Science", dept: "Computer Science", year: 2027, skills: ["JavaScript", "Python", "Git"], cats: ["Software Engineering"], quiet: false },
  { email: "fatima.bsaf.test@iobm.edu.pk", fullName: "Fatima Sheikh", degree: "BS Accounting & Finance", dept: "Accounting & Finance", year: 2026, skills: ["Excel", "Accounting", "IFRS"], cats: ["Finance"], quiet: false },
  { email: "zain.econ.test@iobm.edu.pk", fullName: "Zain Malik", degree: "BS Economics", dept: "Economics", year: 2027, skills: ["Excel", "Stata", "Writing"], cats: ["Business / Consulting"], quiet: true },
  { email: "hira.media.test@iobm.edu.pk", fullName: "Hira Qureshi", degree: "BS Media Studies", dept: "Media Studies", year: 2028, skills: ["Writing", "Canva", "Social media"], cats: ["Marketing"], quiet: true },
  { email: "ali.bba.test@iobm.edu.pk", fullName: "Ali Raza", degree: "BBA", dept: "Business Administration", year: 2026, skills: ["Excel", "PowerPoint", "SQL"], cats: ["Business / Consulting", "Operations"], quiet: false },
  { email: "sana.se.test@iobm.edu.pk", fullName: "Sana Iqbal", degree: "BS Software Engineering", dept: "Computer Science", year: 2027, skills: ["TypeScript", "React", "Git"], cats: ["Software Engineering", "Product"], quiet: false },
  { email: "umar.mkt.test@iobm.edu.pk", fullName: "Umar Farooq", degree: "BBA Marketing", dept: "Marketing", year: 2028, skills: ["Writing", "Excel", "Research"], cats: ["Marketing"], quiet: true },
  { email: "mehak.fin.test@iobm.edu.pk", fullName: "Mehak Ali", degree: "BSAF", dept: "Accounting & Finance", year: 2026, skills: ["Excel", "Financial modelling", "Accounting"], cats: ["Finance"], quiet: false },
]

const UNI_JOBS = [
  {
    id: "b2b31000-0000-4000-8000-000000000001",
    title: "Brand Intern — Unilever Pakistan",
    job_type: "internship",
    category: "Marketing",
    required_skills: ["Writing", "Excel", "Canva"],
    nice_to_have_skills: ["Social media"],
    location: "Karachi — Unilever House",
    salary_min: 40000,
    salary_max: 55000,
    compensation_note: "Monthly stipend",
    description: "Support the Karachi brand calendar through the Spring fair cycle. Draft copy, pull campaign numbers, and sit in the weekly huddle. Open to IoBM BBA and Media students.",
  },
  {
    id: "b2b31000-0000-4000-8000-000000000002",
    title: "Supply Chain Intern",
    job_type: "internship",
    category: "Operations",
    required_skills: ["Excel", "SQL"],
    nice_to_have_skills: ["Python"],
    location: "Karachi",
    salary_min: 35000,
    salary_max: 50000,
    compensation_note: "Monthly stipend",
    description: "Sit with Unilever’s Karachi planning team. Reconcile a weekly demand snapshot and present one improvement brief to CDC at the end of term.",
  },
  {
    id: "b2b31000-0000-4000-8000-000000000003",
    title: "Graduate Management Trainee",
    job_type: "full_time",
    category: "Business / Consulting",
    required_skills: ["Excel", "Writing", "Product sense"],
    nice_to_have_skills: ["SQL"],
    location: "Karachi — Unilever House",
    salary_min: 130000,
    salary_max: 180000,
    compensation_note: "Base + medical",
    description: "Unilever Pakistan GMT. Rotate through brand, customer development, and supply. IoBM class of 2026–2027. CDC-approved listing.",
    alumni_only: false,
  },
  {
    id: "b2b31000-0000-4000-8000-000000000004",
    title: "Brand Manager — Home Care (alumni)",
    job_type: "full_time",
    category: "Marketing",
    required_skills: ["Writing", "Excel", "Brand"],
    nice_to_have_skills: ["Nielsen", "Media planning"],
    location: "Karachi",
    salary_min: 250000,
    salary_max: 320000,
    compensation_note: "Base + bonus",
    description: "Mid-career seat for IoBM alumni with 3+ years in FMCG brand. Own a Home Care SKU P&L.",
    alumni_only: true,
    experience_level: "experienced",
  },
]

const EVENT_IDS = [
  "a1b11000-0000-4000-8000-000000000001",
  "a1b11000-0000-4000-8000-000000000002",
  "a1b11000-0000-4000-8000-000000000003",
  "a1b11000-0000-4000-8000-000000000004",
]

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

function daysAgo(n, hour = 11) {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - n)
  d.setUTCHours(hour, n * 3, 0, 0)
  return d.toISOString()
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
  throw new Error(`${email}: exists but could not be loaded`)
}

async function tryUpsert(sb, table, rows, onConflict) {
  const { error } = await sb.from(table).upsert(rows, onConflict ? { onConflict } : undefined)
  if (error) {
    console.warn(`${table}:`, error.message)
    return false
  }
  return true
}

async function tryInsert(sb, table, rows) {
  const { error } = await sb.from(table).insert(rows)
  if (error) {
    console.warn(`${table}:`, error.message)
    return false
  }
  return true
}

async function tryUpsertFlexible(sb, table, rows, onConflict) {
  const copies = rows.map((row) => ({ ...row }))
  for (let i = 0; i < 16; i++) {
    const { error } = await sb.from(table).upsert(copies, onConflict ? { onConflict } : undefined)
    if (!error) return true
    const missing = error.message.match(/'([a-z_]+)' column/i)?.[1]
    if (missing) {
      for (const row of copies) delete row[missing]
      continue
    }
    console.warn(`${table}:`, error.message)
    return false
  }
  return false
}

async function wipeAndInsert(sb, table, rows, filter) {
  if (filter) await filter()
  return tryInsert(sb, table, rows)
}

async function ensureAccount(sb, account) {
  const userId = await findUserId(sb, account.email, account.fullName)
  await sb.auth.admin.updateUserById(userId, {
    password: PASSWORD,
    email_confirm: true,
    user_metadata: {
      full_name: account.fullName,
      role: account.role,
      university: UNI,
      sso: "iobm",
      portal: account.portal,
      alumni: account.portal === "alumni",
      staff_role: account.staffRole || null,
    },
    app_metadata: { sso: "iobm", sso_status: "active" },
  })
  const profile = await sb.from("profiles").upsert(
    { id: userId, role: account.role, full_name: account.fullName, bio: account.portal === "employer" ? "Talent lead at Unilever Pakistan, hiring IoBM interns and graduates." : `${account.fullName} · IoBM test account.` },
    { onConflict: "id" }
  )
  if (profile.error) console.warn("profiles", account.email, profile.error.message)
  return userId
}

async function upsertStudent(sb, userId, fields) {
  const row = {
    id: userId,
    university: UNI,
    institution_type: "university",
    ...fields,
  }
  for (let i = 0; i < 12; i++) {
    const { error } = await sb.from("student_profiles").upsert(row, { onConflict: "id" })
    if (!error) return true
    const missing = error.message.match(/'([a-z_]+)' column/i)?.[1]
    if (missing && missing in row) {
      delete row[missing]
      continue
    }
    console.warn("student_profiles", error.message)
    return false
  }
  return false
}

async function upsertJobs(sb, jobs) {
  const rows = jobs.map((job) => ({ ...job }))
  for (let i = 0; i < 12; i++) {
    const { error } = await sb.from("jobs").upsert(rows, { onConflict: "id" })
    if (!error) return true
    const missing = error.message.match(/'([a-z_]+)' column/i)?.[1]
    if (missing) {
      for (const row of rows) delete row[missing]
      continue
    }
    console.warn("jobs", error.message)
    return false
  }
  return false
}

async function main() {
  const sb = admin()
  const ids = {}

  for (const account of ACCOUNTS) {
    try {
      ids[account.portal === "faculty" ? account.staffRole || account.email : account.portal] = await ensureAccount(sb, account)
      console.log("account", account.email)
    } catch (error) {
      console.warn("skip account", account.email, error.message)
    }
  }

  const studentId = ids.student
  const alumniId = ids.alumni
  const cdcId = ids.director
  const facultyId = ids.advisor
  const deanId = ids.dean
  const employerId = ids.employer

  for (const [id, name, seed] of [
    [cdcId, "Sara CDC Director", "Sara%20CDC"],
    [facultyId, "Omar Faculty", "Omar%20Faculty"],
    [deanId, "Nida Dean", "Nida%20Dean"],
  ].filter((row) => row[0])) {
    await sb.from("profiles").update({
      bio: `${name} · IoBM Career Development Center.`,
      avatar_url: `https://api.dicebear.com/9.x/initials/svg?seed=${seed}&backgroundColor=051C2C&textColor=ffffff`,
    }).eq("id", id)
  }

  if (cdcId) {
    const staff = { user_id: cdcId, university: UNI, staff_role: "director" }
    const { error } = await sb.from("campus_staff").upsert(staff, { onConflict: "user_id" })
    if (error) {
      await sb.from("campus_staff").delete().eq("user_id", cdcId)
      const retry = await sb.from("campus_staff").insert(staff)
      if (retry.error) console.warn("cdc staff", retry.error.message)
    }
  }
  if (facultyId) {
    const staff = { user_id: facultyId, university: UNI, staff_role: "advisor" }
    const { error } = await sb.from("campus_staff").upsert(staff, { onConflict: "user_id" })
    if (error) {
      await sb.from("campus_staff").delete().eq("user_id", facultyId)
      await sb.from("campus_staff").insert(staff)
    }
  }
  if (deanId) {
    const staff = { user_id: deanId, university: UNI, staff_role: "dean" }
    const { error } = await sb.from("campus_staff").upsert(staff, { onConflict: "user_id" })
    if (error) console.warn("dean staff", error.message)
  }

  if (studentId) {
    await sb.from("campus_staff").delete().eq("user_id", studentId)
    await upsertStudent(sb, studentId, {
      degree: "BBA",
      department: "Business Administration",
      graduation_year: 2027,
      still_enrolled: true,
      current_semester: 6,
      cgpa: 3.42,
      is_alumni: false,
      gender: "female",
      skills: ["Excel", "SQL", "Writing", "PowerPoint"],
      preferred_job_categories: ["Business / Consulting", "Marketing", "Operations"],
      preferred_locations: ["Karachi", "Remote"],
      linkedin_url: "https://www.linkedin.com/in/ayesha-student-iobm",
      github_url: "https://github.com/ayesha-iobm",
      resume_url: "https://www.iobm.edu.pk",
    })
    await sb.from("profiles").update({
      bio: "BBA sixth semester. Looking at brand, ops, and GMT seats for summer 2027.",
      avatar_url: "https://api.dicebear.com/9.x/initials/svg?seed=Ayesha%20Student&backgroundColor=051C2C&textColor=ffffff",
    }).eq("id", studentId)
  }

  if (alumniId) {
    await sb.from("campus_staff").delete().eq("user_id", alumniId)
    await upsertStudent(sb, alumniId, {
      degree: "BBA Marketing",
      department: "Marketing",
      graduation_year: 2022,
      still_enrolled: false,
      current_semester: null,
      cgpa: 3.61,
      is_alumni: true,
      mentorship_opt_in: true,
      gender: "male",
      skills: ["Brand", "Excel", "Writing", "Nielsen"],
      preferred_job_categories: ["Marketing", "Business / Consulting"],
      preferred_locations: ["Karachi"],
      linkedin_url: "https://www.linkedin.com/in/hamza-alumni-iobm",
      resume_url: "https://www.iobm.edu.pk",
      github_url: null,
      work_history: [
        { company: "Unilever Pakistan", title: "Assistant Brand Manager", start: "2023-01", end: null, current: true },
        { company: "Jazz", title: "Marketing Associate", start: "2022-07", end: "2022-12", current: false },
      ],
    })
    await sb.from("profiles").update({
      bio: "IoBM BBA Marketing 2022. Assistant Brand Manager at Unilever Pakistan. Mentoring two BBA students this cycle.",
      avatar_url: "https://api.dicebear.com/9.x/initials/svg?seed=Hamza%20Alumni&backgroundColor=051C2C&textColor=ffffff",
    }).eq("id", alumniId)
    await tryUpsert(sb, "mentorship_profiles", [
      {
        user_id: alumniId,
        expertise: "FMCG brand and campaign planning",
        industries: "FMCG, Marketing",
        topics: "Internships, first job, brand interviews",
        format: "Online",
        capacity: 4,
        is_discoverable: true,
      },
    ])
  }

  if (employerId) {
    await sb.from("campus_staff").delete().eq("user_id", employerId)
    await tryUpsert(
      sb,
      "recruiter_profiles",
      [
        {
          id: employerId,
          company_name: "Unilever Pakistan",
          description:
            "FMCG manufacturer hiring IoBM interns and graduates into brand, supply chain, and finance. CDC preferred partner for the Spring 2027 fair.",
          hiring_focus: "Brand, supply chain, and GMT seats for IoBM BBA, BSAF, and Media students.",
          website_url: "https://www.unilever.pk",
          industry: "FMCG",
          employee_count: "1000+",
          is_approved: true,
          logo_url: "https://logo.clearbit.com/unilever.com",
        },
      ],
      "id"
    )
    await sb.from("profiles").update({
      bio: "Talent lead at Unilever Pakistan, hiring IoBM interns and graduates.",
      avatar_url: "https://api.dicebear.com/9.x/initials/svg?seed=Nadia%20Recruiter&backgroundColor=2251FF&textColor=ffffff",
    }).eq("id", employerId)
    const existingPartner = await sb
      .from("campus_employer_partners")
      .select("id")
      .eq("university", UNI)
      .eq("recruiter_id", employerId)
      .maybeSingle()
    if (existingPartner.data?.id) {
      await sb.from("campus_employer_partners").update({ tier: "preferred", notes: "IoBM test employer — Unilever Pakistan" }).eq("id", existingPartner.data.id)
    } else {
      const { error } = await sb.from("campus_employer_partners").insert({
        university: UNI,
        recruiter_id: employerId,
        tier: "preferred",
        notes: "IoBM test employer — Unilever Pakistan",
      })
      if (error) console.warn("partners", error.message)
    }
  }

  const cohortIds = []
  for (const person of COHORT) {
    try {
      const id = await findUserId(sb, person.email, person.fullName)
      await sb.auth.admin.updateUserById(id, {
        password: PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: person.fullName, role: "student", university: UNI, sso: "iobm", portal: "student" },
      })
      await sb.from("profiles").upsert({ id, role: "student", full_name: person.fullName, bio: `${person.fullName} · IoBM ${person.degree}.` }, { onConflict: "id" })
      await upsertStudent(sb, id, {
        degree: person.degree,
        department: person.dept,
        graduation_year: person.year,
        still_enrolled: person.year >= 2027,
        current_semester: person.year >= 2028 ? 4 : 7,
        cgpa: person.quiet ? 2.85 : 3.3,
        is_alumni: false,
        skills: person.skills,
        preferred_job_categories: person.cats,
        linkedin_url: `https://www.linkedin.com/in/${person.email.split("@")[0].replace(/\./g, "-")}`,
        resume_url: person.quiet ? null : "https://www.iobm.edu.pk",
      })
      cohortIds.push({ ...person, id })
      console.log("cohort", person.email)
    } catch (error) {
      console.warn("skip cohort", person.email, error.message)
    }
  }

  if (employerId) {
    const jobs = UNI_JOBS.map((job, i) => ({
      ...job,
      recruiter_id: employerId,
      is_remote: false,
      is_active: true,
      salary_currency: "PKR",
      screening_questions: [],
      required_semesters: [],
      distribution_scope: "partner_universities",
      target_universities: [UNI],
      created_at: daysAgo(12 - i * 2),
    }))
    await upsertJobs(sb, jobs)
    const pendingJob = {
      id: "b2b31000-0000-4000-8000-000000000005",
      recruiter_id: employerId,
      title: "Finance Intern — Unilever Pakistan",
      job_type: "internship",
      category: "Finance",
      required_skills: ["Excel", "Accounting"],
      nice_to_have_skills: ["IFRS"],
      location: "Karachi — Unilever House",
      salary_min: 38000,
      salary_max: 52000,
      compensation_note: "Monthly stipend",
      description: "Support Unilever Pakistan FP&A through the Spring cycle. Waiting on IoBM CDC approval before students can see it.",
      is_remote: false,
      is_active: true,
      salary_currency: "PKR",
      screening_questions: [],
      required_semesters: [],
      distribution_scope: "partner_universities",
      target_universities: [UNI],
      created_at: daysAgo(1),
    }
    await upsertJobs(sb, [pendingJob])
    const reviewJobIds = [...UNI_JOBS.map((j) => j.id), pendingJob.id]
    await sb.from("campus_job_reviews").delete().in("job_id", reviewJobIds)
    await tryInsert(sb, "campus_job_reviews", [
      ...UNI_JOBS.map((job) => ({
        job_id: job.id,
        university: UNI,
        status: "approved",
        reviewed_by: cdcId || null,
        reviewed_at: daysAgo(8),
        reason: "CDC demo approval",
      })),
      {
        job_id: pendingJob.id,
        university: UNI,
        status: "pending",
        reviewed_by: null,
        reviewed_at: null,
        reason: "Awaiting CDC review",
      },
    ])
  }

  let liveJobsRes = await sb
    .from("jobs")
    .select("id, recruiter_id, title, alumni_only, created_at")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(40)
  if (liveJobsRes.error) {
    liveJobsRes = await sb
      .from("jobs")
      .select("id, recruiter_id, title, created_at")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(40)
  }
  const allJobs = liveJobsRes.data || []
  const { data: employerJobs } = employerId
    ? await sb.from("jobs").select("id, recruiter_id, title, created_at").eq("recruiter_id", employerId).eq("is_active", true)
    : { data: [] }
  const uniPool = employerJobs || []
  const internJobs = allJobs.filter((j) => !uniPool.some((u) => u.id === j.id))
  const openJobs = [
    ...uniPool.filter((j) => j.id !== UNI_JOBS[3].id),
    ...internJobs,
  ].slice(0, 12)

  const actors = [studentId, alumniId, ...cohortIds.map((c) => c.id)].filter(Boolean)

  if (openJobs.length && actors.length) {
    const swipeRows = []
    const matchRows = []
    const viewRows = []
    const profileViewRows = []

    const stamp = (student, job, days, direction) => {
      swipeRows.push({
        student_id: student,
        job_id: job.id,
        direction,
        created_at: daysAgo(days),
      })
    }

    if (studentId) {
      openJobs.slice(0, 6).forEach((job, i) => stamp(studentId, job, 2 + i, i === 5 ? "saved" : "right"))
      openJobs.slice(6, 8).forEach((job, i) => stamp(studentId, job, 9 + i, "left"))
    }
    if (alumniId) {
      const alumniJob = allJobs.find((j) => j.id === UNI_JOBS[3].id) || openJobs[0]
      if (alumniJob) stamp(alumniId, alumniJob, 3, "right")
      openJobs.slice(0, 3).forEach((job, i) => stamp(alumniId, job, 4 + i, "right"))
    }
    for (const person of cohortIds) {
      if (person.quiet) continue
      openJobs.slice(0, 5).forEach((job, i) => stamp(person.id, job, 1 + (i % 10), "right"))
    }

    const { data: oldMatches } = await sb.from("matches").select("id").in("student_id", actors)
    const oldMatchIds = (oldMatches || []).map((row) => row.id)
    if (oldMatchIds.length) {
      const { data: convs } = await sb.from("conversations").select("id").in("match_id", oldMatchIds)
      const convIds = (convs || []).map((row) => row.id)
      if (convIds.length) {
        await sb.from("messages").delete().in("conversation_id", convIds)
        await sb.from("conversations").delete().in("id", convIds)
      }
      await sb.from("matches").delete().in("id", oldMatchIds)
    }
    await sb.from("job_swipes").delete().in("student_id", actors)
    await tryInsert(sb, "job_swipes", swipeRows)

    const right = swipeRows.filter((s) => s.direction === "right")
    for (const swipe of right) {
      const job = allJobs.find((j) => j.id === swipe.job_id)
      if (!job) continue
      matchRows.push({
        student_id: swipe.student_id,
        recruiter_id: job.recruiter_id,
        job_id: job.id,
        is_shortlisted: swipe.student_id === studentId || swipe.student_id === alumniId,
        is_archived: false,
        pipeline_status:
          swipe.student_id === alumniId
            ? "interview"
            : swipe.student_id === studentId
              ? "chatting"
              : swipe.job_id === UNI_JOBS[2].id
                ? "offer"
                : cohortIds.find((c) => c.id === swipe.student_id)?.year === 2026
                  ? "hired"
                  : "chatting",
        created_at: swipe.created_at,
      })
    }
    await tryInsert(sb, "matches", matchRows)

    const { data: matches } = await sb.from("matches").select("id, student_id, recruiter_id").in("student_id", actors)
    for (const match of matches || []) {
      const existing = await sb.from("conversations").select("id").eq("match_id", match.id).maybeSingle()
      let convId = existing.data?.id
      if (!convId) {
        const inserted = await sb.from("conversations").insert({ match_id: match.id }).select("id").maybeSingle()
        convId = inserted.data?.id
      }
      if (!convId) continue
      await sb.from("messages").delete().eq("conversation_id", convId)
      await tryInsert(sb, "messages", [
        {
          conversation_id: convId,
          sender_id: match.recruiter_id,
          content: "Thanks for applying — can you share a one-page CV before Friday?",
          is_read: true,
          created_at: daysAgo(2, 14),
        },
        {
          conversation_id: convId,
          sender_id: match.student_id,
          content: "Sent. Happy to jump on a call this week.",
          is_read: false,
          created_at: daysAgo(1, 16),
        },
      ])
    }

    if (employerId && studentId) {
      profileViewRows.push({ student_id: studentId, viewer_id: employerId, created_at: daysAgo(1, 9) })
      if (alumniId) profileViewRows.push({ student_id: alumniId, viewer_id: employerId, created_at: daysAgo(2, 9) })
    }
    for (const job of UNI_JOBS) {
      for (const person of [studentId, ...cohortIds.filter((c) => !c.quiet).map((c) => c.id)].slice(0, 6)) {
        if (!person) continue
        viewRows.push({ job_id: job.id, student_id: person, created_at: daysAgo(3) })
      }
    }
    if (profileViewRows.length) {
      await sb.from("profile_views").delete().in("student_id", [studentId, alumniId].filter(Boolean))
      await tryInsert(sb, "profile_views", profileViewRows)
    }
    if (viewRows.length) {
      await sb.from("job_views").delete().in("job_id", UNI_JOBS.map((j) => j.id))
      await tryInsert(sb, "job_views", viewRows)
    }
    console.log("swipes", swipeRows.length, "matches", matchRows.length)
  }

  const eventRows = [
    {
      id: EVENT_IDS[0],
      university: UNI,
      title: "Resume lab with IoBM CDC",
      kind: "workshop",
      summary: "Bring a printed CV. Advisors mark one version you can upload the same afternoon.",
      location: "CDC, CBM Building, 2nd floor",
      starts_at: daysAgo(-6, 11),
    },
    {
      id: EVENT_IDS[1],
      university: UNI,
      title: "Unilever Pakistan — campus info session",
      kind: "info_session",
      summary: "Summer internship tracks in brand, supply chain, and finance.",
      location: "Auditorium A, Student Center",
      starts_at: daysAgo(-9, 15),
    },
    {
      id: EVENT_IDS[2],
      university: UNI,
      title: "Interview prep for banks and Big 4",
      kind: "workshop",
      summary: "Case drills and competency answers before the fair.",
      location: "CES seminar room 3",
      starts_at: daysAgo(-14, 14),
    },
    {
      id: EVENT_IDS[3],
      university: UNI,
      title: "Spring 2027 career fair",
      kind: "career_fair",
      summary: "40 employers on the Korangi Creek lawn.",
      location: "Main lawn, Korangi Creek campus",
      starts_at: daysAgo(-16, 10),
    },
  ]
  await tryUpsertFlexible(sb, "campus_events", eventRows, "id")

  if (facultyId) {
    const appointmentStudents = [
      studentId && { id: studentId, kind: "Resume review — Walk through Unilever GMT CV", when: -2, status: "booked" },
      studentId && { id: studentId, kind: "Internship search", when: 5, status: "completed" },
      alumniId && { id: alumniId, kind: "Mentorship matching", when: -6, status: "booked" },
      ...cohortIds.slice(0, 4).map((person, i) => ({
        id: person.id,
        kind: i % 2 ? "Career advising" : "Resume review",
        when: -3 - i,
        status: i === 0 ? "completed" : "booked",
      })),
    ].filter(Boolean)
    const appointmentRows = appointmentStudents.map((row, i) => ({
      id: `b2b41000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
      student_id: row.id,
      university: UNI,
      advisor_id: facultyId,
      kind: row.kind,
      starts_at: daysAgo(row.when, 10 + (i % 5)),
      status: row.status,
    }))
    await tryUpsertFlexible(sb, "campus_appointments", appointmentRows, "id")
  }

  if (studentId && alumniId) {
    await sb.from("mentorship_requests").delete().eq("student_id", studentId)
    await tryInsert(sb, "mentorship_requests", [
      {
        student_id: studentId,
        mentor_id: alumniId,
        topic: "Unilever brand internship",
        note: "Applying to the Home Care intern seat. Want a mock interview.",
        status: "accepted",
      },
    ])
  }

  const rsvpStudents = [studentId, alumniId, ...cohortIds.filter((c) => !c.quiet).map((c) => c.id)].filter(Boolean)
  if (rsvpStudents.length) {
    await sb.from("campus_event_rsvps").delete().in("student_id", rsvpStudents)
    const rsvps = []
    for (const eventId of EVENT_IDS) {
      for (const sid of rsvpStudents.slice(0, 5)) {
        rsvps.push({ event_id: eventId, student_id: sid, hired_from_event: eventId.endsWith("004") && sid === alumniId })
      }
    }
    await tryUpsertFlexible(sb, "campus_event_rsvps", rsvps, "event_id,student_id")
  }

  const outcomeStudents = [alumniId, ...cohortIds.filter((c) => c.year === 2026).map((c) => c.id)].filter(Boolean)
  if (outcomeStudents.length) {
    await sb.from("campus_outcomes").delete().in("student_id", outcomeStudents)
    await tryInsert(
      sb,
      "campus_outcomes",
      outcomeStudents.flatMap((sid) =>
        ["graduation", "3mo", "6mo", "12mo"].map((checkpoint, i) => ({
          student_id: sid,
          university: UNI,
          checkpoint,
          status: sid === alumniId ? "employed" : i === 0 ? "still_seeking" : i === 3 ? "employed" : "employed",
          industry: sid === alumniId ? "FMCG" : "Finance",
          job_title: sid === alumniId ? "Assistant Brand Manager" : "Analyst",
          location: "Karachi",
          employer_type: "corporate",
          requires_degree: true,
          cohort_year: 2026,
          salary: sid === alumniId ? 210000 : 95000 + i * 5000,
          internship_converted: sid === alumniId || i > 0,
        }))
      )
    )
  }

  const demoPeople = [
    studentId && { id: studentId, first_gen: false, international: false, gender: "female", pell: false, disability: false, veteran: false, transfer: false },
    alumniId && { id: alumniId, first_gen: true, international: false, gender: "male", pell: false, disability: false, veteran: false, transfer: false },
    ...cohortIds.map((person, i) => ({
      id: person.id,
      first_gen: i % 3 === 0,
      international: i === 2,
      gender: person.fullName.match(/Fatima|Hira|Sana|Mehak/) ? "female" : "male",
      pell: i % 4 === 0,
      disability: i === 5,
      veteran: false,
      transfer: i === 4,
    })),
  ].filter(Boolean)
  if (demoPeople.length) {
    await sb.from("campus_demographics").delete().in("student_id", demoPeople.map((p) => p.id))
    await tryInsert(
      sb,
      "campus_demographics",
      demoPeople.map((p) => ({
        student_id: p.id,
        consent_at: daysAgo(40),
        first_gen: p.first_gen,
        disability: p.disability,
        pell_or_low_income: p.pell,
        international: p.international,
        gender: p.gender,
        race_ethnicity: p.international ? "Asian — international" : "Asian — Pakistani",
        work_auth: p.international ? "student_visa" : "citizen",
        veteran: p.veteran,
        transfer_student: p.transfer,
      }))
    )
  }

  const experiential = [
    studentId && {
      student_id: studentId,
      employer_name: "Unilever Pakistan",
      role_title: "Brand intern (summer 2026)",
      kind: "internship",
      start_date: "2026-06-01",
      end_date: "2026-08-15",
      learning_objectives: "Campaign calendar support and weekly brand huddle.",
      status: "verified",
    },
    alumniId && {
      student_id: alumniId,
      employer_name: "Jazz",
      role_title: "Marketing Associate",
      kind: "job",
      start_date: "2022-07-01",
      end_date: "2022-12-31",
      learning_objectives: "First role after graduation.",
      status: "verified",
    },
    ...cohortIds.filter((c) => !c.quiet).slice(0, 3).map((person) => ({
      student_id: person.id,
      employer_name: person.year === 2026 ? "Systems Limited" : "Careem",
      role_title: "Intern",
      kind: "internship",
      start_date: "2026-06-01",
      end_date: person.year === 2026 ? "2026-08-01" : null,
      learning_objectives: "Logged for CDC credit.",
      status: person.year === 2026 ? "verified" : "self_reported",
    })),
  ].filter(Boolean)
  if (experiential.length) {
    await sb.from("experiential_records").delete().in("student_id", experiential.map((r) => r.student_id))
    await tryInsert(sb, "experiential_records", experiential)
  }

  if (cdcId) {
    await tryInsert(sb, "campus_nudges", [
      {
        university: UNI,
        created_by: cdcId,
        segment: "Seniors with no applications",
        title: "Apply this week",
        body: "Unilever GMT and Brand Intern are live. Open Discover and apply before Friday.",
      },
    ])
    await tryInsert(sb, "campus_audit_log", [
      { actor_id: cdcId, action: "view_overview", entity: "campus", entity_id: UNI },
      { actor_id: cdcId, action: "approve_job", entity: "campus_job_reviews", entity_id: UNI_JOBS[0].id },
      { actor_id: facultyId || cdcId, action: "view_appointments", entity: "campus_appointments", entity_id: UNI },
      { actor_id: deanId || cdcId, action: "view_reports", entity: "campus_outcomes", entity_id: UNI },
      { actor_id: deanId || cdcId, action: "view_equity", entity: "campus_demographics", entity_id: UNI },
    ])
    await sb.from("campus_saved_views").delete().in("user_id", [cdcId, deanId].filter(Boolean))
    await tryInsert(sb, "campus_saved_views", [
      { user_id: cdcId, name: "Spring fair pipeline", path: "/campus/applications", filters: {} },
      { user_id: cdcId, name: "Quiet seniors", path: "/campus/actions", filters: {} },
      ...(deanId
        ? [
            { user_id: deanId, name: "NACE first destination", path: "/campus/reports", filters: {} },
            { user_id: deanId, name: "School outcomes", path: "/campus/outcomes", filters: {} },
          ]
        : []),
    ])
  }

  await tryInsert(sb, "campus_surveys", [
    { university: UNI, target: "office", nps: 62 },
    { university: UNI, target: "platform", nps: 48 },
    { university: UNI, target: "office", nps: 71 },
  ])

  const reviewStudents = [studentId, ...cohortIds.slice(0, 3).map((c) => c.id)].filter(Boolean)
  if (reviewStudents.length) {
    await sb.from("campus_resume_reviews").delete().in("student_id", reviewStudents)
    await tryInsert(
      sb,
      "campus_resume_reviews",
      reviewStudents.map((sid) => ({ university: UNI, student_id: sid }))
    )
  }

  const notifyUsers = [studentId, alumniId, employerId, cdcId, facultyId, deanId].filter(Boolean)
  if (notifyUsers.length) {
    await sb.from("notifications").delete().in("user_id", notifyUsers).in("type", [
      "pipeline_update",
      "appointment",
      "application",
      "campus_nudge",
      "match",
      "report",
    ])
  }
  const notices = [
    studentId && {
      user_id: studentId,
      type: "pipeline_update",
      title: "You’re shortlisted",
      body: "Unilever Pakistan moved you to shortlist for Brand Intern.",
      data: {},
    },
    studentId && {
      user_id: studentId,
      type: "appointment",
      title: "Advising confirmed",
      body: "Omar Faculty confirmed your resume review.",
      data: {},
    },
    alumniId && {
      user_id: alumniId,
      type: "match",
      title: "Interview scheduled",
      body: "Unilever Pakistan wants a Brand Manager interview this week.",
      data: {},
    },
    employerId && {
      user_id: employerId,
      type: "application",
      title: "New IoBM applicants",
      body: "Ayesha Student and two classmates applied to Brand Intern.",
      data: {},
    },
    cdcId && {
      user_id: cdcId,
      type: "application",
      title: "Job waiting on approval",
      body: "Unilever Pakistan submitted Finance Intern for CDC review.",
      data: {},
    },
    facultyId && {
      user_id: facultyId,
      type: "appointment",
      title: "Three advising slots this week",
      body: "Ayesha Student and two BBA students booked resume reviews.",
      data: {},
    },
    deanId && {
      user_id: deanId,
      type: "report",
      title: "First-destination draft is ready",
      body: "Class of 2026 outcomes are populated for the HEC / NBEAC export.",
      data: {},
    },
    ...cohortIds
      .filter((c) => c.quiet)
      .slice(0, 2)
      .map((person) => ({
        user_id: person.id,
        type: "campus_nudge",
        title: "Apply this week",
        body: "CDC: Unilever GMT and Brand Intern are live. Open Discover before Friday.",
        data: { university: UNI, source: "career_office" },
      })),
  ].filter(Boolean)
  if (notices.length) await tryInsert(sb, "notifications", notices)

  const classOf2026 = cohortIds.filter((c) => c.year === 2026)
  const surveyRows = [
    alumniId && {
      student_id: alumniId,
      survey_year: 2026,
      employment_status: "employed",
      employer: "Unilever Pakistan",
      designation: "Assistant Brand Manager",
      industry: "FMCG",
      salary_pkr: 210000,
      related_to_degree: "yes",
      satisfaction: 5,
      further_study: null,
      comments: "IoBM CDC intro in 2022. Still mentoring two BBA students.",
      submitted_at: daysAgo(20),
    },
    alumniId && {
      student_id: alumniId,
      survey_year: 2025,
      employment_status: "employed",
      employer: "Unilever Pakistan",
      designation: "Assistant Brand Manager",
      industry: "FMCG",
      salary_pkr: 185000,
      related_to_degree: "yes",
      satisfaction: 5,
      further_study: null,
      comments: "Promoted internally after the Jazz year.",
      submitted_at: daysAgo(380),
    },
    classOf2026[0] && {
      student_id: classOf2026[0].id,
      survey_year: 2026,
      employment_status: "employed",
      employer: "Systems Limited",
      designation: "Graduate Financial Analyst",
      industry: "Finance",
      salary_pkr: 95000,
      related_to_degree: "yes",
      satisfaction: 4,
      further_study: null,
      comments: "Offer came through the Spring fair.",
      submitted_at: daysAgo(12),
    },
    classOf2026[1] && {
      student_id: classOf2026[1].id,
      survey_year: 2026,
      employment_status: "employed",
      employer: "Careem",
      designation: "Operations Analyst",
      industry: "Operations",
      salary_pkr: 90000,
      related_to_degree: "somewhat",
      satisfaction: 4,
      further_study: null,
      comments: "Logged the internship conversion with CDC.",
      submitted_at: daysAgo(9),
    },
    classOf2026[2] && {
      student_id: classOf2026[2].id,
      survey_year: 2026,
      employment_status: "seeking",
      employer: null,
      designation: null,
      industry: null,
      salary_pkr: null,
      related_to_degree: null,
      satisfaction: 3,
      further_study: null,
      comments: "Interviewing with Unilever FP&A. Resume is with Omar Faculty.",
      submitted_at: daysAgo(4),
    },
  ].filter(Boolean)
  if (surveyRows.length) {
    const table = await sb.from("career_surveys").select("student_id").limit(1)
    if (!table.error) {
      await tryUpsertFlexible(sb, "career_surveys", surveyRows, "student_id,survey_year")
    } else {
      const buckets = await sb.storage.listBuckets()
      if (!(buckets.data || []).some((bucket) => bucket.name === "career-surveys")) {
        const created = await sb.storage.createBucket("career-surveys", { public: false, fileSizeLimit: 50000 })
        if (created.error && !/already exists|duplicate/i.test(created.error.message)) {
          console.warn("career-surveys bucket", created.error.message)
        }
      }
      for (const row of surveyRows) {
        const path = `${row.student_id}__${row.survey_year}.json`
        const uploaded = await sb.storage.from("career-surveys").upload(path, JSON.stringify(row), {
          upsert: true,
          contentType: "application/json",
        })
        if (uploaded.error) console.warn("career survey file", path, uploaded.error.message)
      }
      console.log("career surveys stored in bucket", surveyRows.length)
    }
  }

  console.log("\nPassword for every seeded login:")
  console.log(PASSWORD)
  console.log("\nDashboards")
  console.log("student    student.test@iobm.edu.pk     /dashboard  /matches  /appointments")
  console.log("alumni     alumni.test@iobm.edu.pk      /dashboard  /mentorship  /profile/experience")
  console.log("employer   employer.test@swypejobs.dev  /dashboard  /jobs  /matches")
  console.log("cdc        cdc.test@iobm.edu.pk         /campus")
  console.log("faculty    faculty.test@iobm.edu.pk     /campus/appointments")
  if (deanId) console.log("dean       dean.test@iobm.edu.pk        /campus/reports")
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
