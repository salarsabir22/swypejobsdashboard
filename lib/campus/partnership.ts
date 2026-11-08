import { createAdminClient } from "@/lib/supabase/admin"
import { directoryUniversity } from "@/lib/campus/directory"
import { sameCampus } from "@/lib/jobs/curation"

export const CAMPUS_PARTNERSHIP_PATH_PREFIX = "__campus_partnership__"

export type CampusPartnershipSubject = "student" | "employer"
export type CampusPartnershipStatus = "active" | "disconnected"

export type CampusPartnershipRecord = {
  id: string
  university: string
  subject: CampusPartnershipSubject
  userId: string
  status: CampusPartnershipStatus
  reason: string | null
  message: string | null
  updatedBy: string | null
  updatedAt: string
}

function partnershipPath(university: string, subject: CampusPartnershipSubject, userId: string) {
  return `${CAMPUS_PARTNERSHIP_PATH_PREFIX}/${subject}/${directoryUniversity(university)}/${userId}`
}

function partnershipPrefix(university: string, subject: CampusPartnershipSubject) {
  return `${CAMPUS_PARTNERSHIP_PATH_PREFIX}/${subject}/${directoryUniversity(university)}/`
}

function parseRecord(row: {
  id: string
  path: string
  filters: unknown
  created_at?: string | null
  user_id?: string | null
}): CampusPartnershipRecord | null {
  const filters = (row.filters && typeof row.filters === "object" ? row.filters : {}) as Record<string, unknown>
  if (filters.type !== "campus_partnership") return null
  const parts = row.path.split("/")
  const subject = (filters.subject === "employer" || parts[1] === "employer" ? "employer" : "student") as CampusPartnershipSubject
  const userId = String(filters.userId || parts[3] || "").trim()
  const university = String(filters.university || parts[2] || "").trim()
  if (!userId || !university) return null
  return {
    id: row.id,
    university,
    subject,
    userId,
    status: filters.status === "active" ? "active" : "disconnected",
    reason: typeof filters.reason === "string" ? filters.reason : null,
    message: typeof filters.message === "string" ? filters.message : null,
    updatedBy: typeof filters.updatedBy === "string" ? filters.updatedBy : row.user_id || null,
    updatedAt: typeof filters.updatedAt === "string" ? filters.updatedAt : row.created_at || new Date().toISOString(),
  }
}

/** Employer partnership rows live on campus_employer_partners; student disconnects use saved views. */
export async function listDisconnectedSubjectIds(opts: {
  university: string
  subject: CampusPartnershipSubject
}) {
  const university = directoryUniversity(opts.university)
  const admin = createAdminClient()
  const ids = new Set<string>()

  // Disconnect state is stored on campus_saved_views (partner table has no reliable status column).
  const { data } = await admin
    .from("campus_saved_views")
    .select("id, path, filters, created_at, user_id")
    .like("path", `${partnershipPrefix(university, opts.subject)}%`)
    .limit(5000)

  for (const row of data || []) {
    const parsed = parseRecord(row)
    if (!parsed || parsed.status !== "disconnected") continue
    if (!sameCampus(parsed.university, university)) continue
    ids.add(parsed.userId)
  }

  return ids
}

export async function getCampusPartnership(opts: {
  university: string
  subject: CampusPartnershipSubject
  userId: string
}) {
  const university = directoryUniversity(opts.university)
  const admin = createAdminClient()

  const path = partnershipPath(university, opts.subject, opts.userId)
  const { data } = await admin
    .from("campus_saved_views")
    .select("id, path, filters, created_at, user_id")
    .eq("path", path)
    .maybeSingle()
  if (data) {
    const parsed = parseRecord(data)
    if (parsed) return parsed
  }

  if (opts.subject === "employer") {
    const { data: partner } = await admin
      .from("campus_employer_partners")
      .select("id, notes, recruiter_id, created_at")
      .eq("university", university)
      .eq("recruiter_id", opts.userId)
      .maybeSingle()
    if (partner) {
      return {
        id: partner.id,
        university,
        subject: "employer" as const,
        userId: opts.userId,
        status: "active",
        reason: partner.notes || null,
        message: null,
        updatedBy: null,
        updatedAt: partner.created_at || new Date().toISOString(),
      } satisfies CampusPartnershipRecord
    }
  }

  return null
}

export async function isCampusPartnershipActive(opts: {
  university: string | null | undefined
  subject: CampusPartnershipSubject
  userId: string
}) {
  if (!opts.university) return false
  const record = await getCampusPartnership({
    university: opts.university,
    subject: opts.subject,
    userId: opts.userId,
  })
  // No record means still connected for students (SSO/onboarding); employers need an active partner row.
  if (opts.subject === "employer") {
    return record?.status === "active"
  }
  return record?.status !== "disconnected"
}

export async function setCampusPartnershipStatus(opts: {
  university: string
  subject: CampusPartnershipSubject
  userId: string
  status: CampusPartnershipStatus
  reason?: string | null
  message?: string | null
  actorId: string
}) {
  const university = directoryUniversity(opts.university)
  const admin = createAdminClient()
  const now = new Date().toISOString()

  if (opts.subject === "employer") {
    const notes =
      opts.status === "disconnected"
        ? [opts.reason, opts.message].filter(Boolean).join(" — ") || "Disconnected by career office"
        : null

    const { data: existing } = await admin
      .from("campus_employer_partners")
      .select("id")
      .eq("university", university)
      .eq("recruiter_id", opts.userId)
      .maybeSingle()

    if (existing?.id) {
      const { error } = await admin
        .from("campus_employer_partners")
        .update({ notes })
        .eq("id", existing.id)
      if (error) throw new Error(error.message)
    } else if (opts.status === "disconnected") {
      const { data: recruiter } = await admin
        .from("recruiter_profiles")
        .select("company_name")
        .eq("id", opts.userId)
        .maybeSingle()
      const { error } = await admin.from("campus_employer_partners").insert({
        university,
        recruiter_id: opts.userId,
        notes,
        created_at: now,
        ...(recruiter?.company_name ? { company_name: recruiter.company_name } : {}),
      })
      if (error) throw new Error(error.message)
    }

    if (opts.status === "disconnected") {
      await stripUniversityFromEmployerJobs({ recruiterId: opts.userId, university })
    }
  }

  const path = partnershipPath(university, opts.subject, opts.userId)
  const payload = {
    type: "campus_partnership",
    subject: opts.subject,
    university,
    userId: opts.userId,
    status: opts.status,
    reason: opts.reason || null,
    message: opts.message || null,
    updatedBy: opts.actorId,
    updatedAt: now,
  }

  const { data: existing } = await admin.from("campus_saved_views").select("id").eq("path", path).maybeSingle()
  if (existing?.id) {
    const { error } = await admin
      .from("campus_saved_views")
      .update({
        name: `${opts.subject}:${opts.userId}`,
        filters: payload,
      })
      .eq("id", existing.id)
    if (error) throw new Error(error.message)
  } else {
    const { error } = await admin.from("campus_saved_views").insert({
      user_id: opts.actorId,
      name: `${opts.subject}:${opts.userId}`,
      path,
      filters: payload,
    })
    if (error) throw new Error(error.message)
  }

  return { university, status: opts.status }
}

/** Remove a campus from this employer's partner-targeted jobs after disconnect. */
async function stripUniversityFromEmployerJobs(opts: { recruiterId: string; university: string }) {
  const admin = createAdminClient()
  const { data: jobs } = await admin
    .from("jobs")
    .select("id, target_universities, distribution_scope")
    .eq("recruiter_id", opts.recruiterId)
    .limit(2000)

  for (const job of jobs || []) {
    const targets = Array.isArray(job.target_universities) ? job.target_universities.filter(Boolean) : []
    if (!targets.length) continue
    const next = targets.filter((name) => !sameCampus(name, opts.university))
    if (next.length === targets.length) continue
    const patch: Record<string, unknown> = {
      target_universities: next,
      updated_at: new Date().toISOString(),
    }
    if (!next.length && job.distribution_scope === "partner_universities") {
      patch.distribution_scope = "network"
    }
    await admin.from("jobs").update(patch).eq("id", job.id)
  }

  const jobIds = (jobs || []).map((j) => j.id)
  if (jobIds.length) {
    await admin
      .from("campus_job_reviews")
      .update({ status: "held", updated_at: new Date().toISOString() })
      .eq("university", directoryUniversity(opts.university))
      .in("job_id", jobIds)
  }
}

export async function listActiveEmployerPartnerUniversities(recruiterId: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from("campus_employer_partners")
    .select("university")
    .eq("recruiter_id", recruiterId)
    .limit(100)
  const universities = [...new Set((data || []).map((row) => directoryUniversity(row.university)).filter(Boolean))]
  const active: string[] = []
  for (const university of universities) {
    const ok = await isCampusPartnershipActive({ university, subject: "employer", userId: recruiterId })
    if (ok) active.push(university)
  }
  return active
}
