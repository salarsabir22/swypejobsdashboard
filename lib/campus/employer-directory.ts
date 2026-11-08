import { createAdminClient } from "@/lib/supabase/admin"
import { EMPLOYEE_RANGES, COMPANY_INDUSTRIES } from "@/lib/company-options"
import { directoryUniversity, formatLastActive } from "@/lib/campus/directory"
import { listDisconnectedSubjectIds } from "@/lib/campus/partnership"

export const CAMPUS_EMPLOYER_DIRECTORY_PAGE_SIZE = 50

export type CampusDirectoryEmployer = {
  id: string
  partnerId: string | null
  name: string
  industry: string | null
  employeeCount: string | null
  linkedinUrl: string | null
  websiteUrl: string | null
  jobsPosted: number
  studentsHired: number
  lastActiveAt: string | null
  lastActiveLabel: string
  suspended: boolean
  status: string | null
}

export type CampusEmployerDirectoryFilters = {
  q?: string
  industry?: string
  employeeCount?: string
  inactiveDays?: number | null
  suspended?: "yes" | "no" | null
}

function clampDays(n: number) {
  if (!Number.isFinite(n) || n < 1) return null
  return Math.min(3650, Math.round(n))
}

function isLinkedInUrl(value: string | null | undefined) {
  if (!value?.trim()) return false
  try {
    const url = new URL(value.trim())
    return (url.protocol === "http:" || url.protocol === "https:") && /(^|\.)linkedin\.com$/i.test(url.hostname)
  } catch {
    return false
  }
}

function linkedinFromWebsite(website: string | null | undefined) {
  if (!website?.trim()) return null
  return isLinkedInUrl(website) ? website.trim() : null
}

export function parseCampusEmployerDirectoryFilters(
  params: Record<string, string | string[] | undefined>
): CampusEmployerDirectoryFilters {
  const get = (key: string) => {
    const raw = params[key]
    return typeof raw === "string" ? raw.trim() : ""
  }

  const q = get("q")
  const industry = get("industry") || undefined
  const employeeCount = get("size") || get("employee_count") || undefined

  let inactiveDays: number | null = null
  const inactive = get("inactive")
  if (inactive === "15" || inactive === "30" || inactive === "45") {
    inactiveDays = Number(inactive)
  } else if (inactive === "custom") {
    inactiveDays = clampDays(Number.parseFloat(get("inactive_n")))
  }

  const suspendedRaw = get("suspended")
  const suspended = suspendedRaw === "yes" || suspendedRaw === "no" ? suspendedRaw : null

  return {
    q: q || undefined,
    industry,
    employeeCount: employeeCount && (EMPLOYEE_RANGES as readonly string[]).includes(employeeCount) ? employeeCount : employeeCount,
    inactiveDays,
    suspended,
  }
}

export function summarizeEmployerDirectoryFilters(filters: CampusEmployerDirectoryFilters): string[] {
  const parts: string[] = []
  if (filters.q) parts.push(`“${filters.q}”`)
  if (filters.industry) parts.push(filters.industry)
  if (filters.employeeCount) parts.push(`${filters.employeeCount} employees`)
  if (filters.inactiveDays) parts.push(`inactive ${filters.inactiveDays}+ days`)
  if (filters.suspended === "yes") parts.push("disconnected from campus")
  if (filters.suspended === "no") parts.push("active campus partners")
  return parts
}

export function suggestEmployerGroupName(filters: CampusEmployerDirectoryFilters) {
  if (filters.industry) return filters.industry
  if (filters.inactiveDays) return `Inactive ${filters.inactiveDays}+ days`
  if (filters.employeeCount) return `${filters.employeeCount} employees`
  if (filters.suspended === "yes") return "Disconnected from campus"
  const parts = summarizeEmployerDirectoryFilters(filters)
  if (parts.length) return parts.slice(0, 2).join(" · ")
  return "All employers"
}

export function employerIndustryOptions() {
  return [...COMPANY_INDUSTRIES]
}

export function employerSizeOptions() {
  return [...EMPLOYEE_RANGES]
}

function pickLatest(...values: (string | null | undefined)[]) {
  let best: string | null = null
  let bestTs = 0
  for (const value of values) {
    if (!value) continue
    const ts = Date.parse(value)
    if (Number.isNaN(ts)) continue
    if (ts > bestTs) {
      bestTs = ts
      best = value
    }
  }
  return best
}

async function disconnectedEmployerIds(university: string, ids: string[]) {
  const disconnected = await listDisconnectedSubjectIds({ university, subject: "employer" })
  const set = new Set<string>()
  for (const id of ids) {
    if (disconnected.has(id)) set.add(id)
  }
  return set
}

async function jobStatsForRecruiters(recruiterIds: string[]) {
  const jobsPosted = new Map<string, number>()
  const jobIdsByRecruiter = new Map<string, string[]>()
  if (!recruiterIds.length) return { jobsPosted, studentsHired: new Map<string, number>() }

  const admin = createAdminClient()
  for (let i = 0; i < recruiterIds.length; i += 100) {
    const chunk = recruiterIds.slice(i, i + 100)
    const { data } = await admin.from("jobs").select("id, recruiter_id").in("recruiter_id", chunk).limit(5000)
    for (const row of data || []) {
      jobsPosted.set(row.recruiter_id, (jobsPosted.get(row.recruiter_id) || 0) + 1)
      const list = jobIdsByRecruiter.get(row.recruiter_id) || []
      list.push(row.id)
      jobIdsByRecruiter.set(row.recruiter_id, list)
    }
  }

  const studentsHired = new Map<string, number>()
  const allJobIds = [...jobIdsByRecruiter.values()].flat()
  for (let i = 0; i < allJobIds.length; i += 200) {
    const chunk = allJobIds.slice(i, i + 200)
    const { data } = await admin
      .from("matches")
      .select("job_id, student_id, pipeline_status")
      .in("job_id", chunk)
      .eq("pipeline_status", "hired")
      .limit(5000)
    const jobToRecruiter = new Map<string, string>()
    for (const [recruiterId, jobIds] of jobIdsByRecruiter) {
      for (const jobId of jobIds) jobToRecruiter.set(jobId, recruiterId)
    }
    const seen = new Set<string>()
    for (const row of data || []) {
      const recruiterId = jobToRecruiter.get(row.job_id)
      if (!recruiterId) continue
      const key = `${recruiterId}:${row.student_id}`
      if (seen.has(key)) continue
      seen.add(key)
      studentsHired.set(recruiterId, (studentsHired.get(recruiterId) || 0) + 1)
    }
  }

  return { jobsPosted, studentsHired }
}

type PartnerRow = {
  id: string
  company_name?: string | null
  recruiter_id?: string | null
  created_at?: string | null
  tier?: string | null
  notes?: string | null
}

type RecruiterRow = {
  id: string
  company_name?: string | null
  industry?: string | null
  employee_count?: string | null
  website_url?: string | null
  updated_at?: string | null
  created_at?: string | null
  profiles?: { updated_at?: string | null; full_name?: string | null } | { updated_at?: string | null; full_name?: string | null }[] | null
}

function asProfile(raw: RecruiterRow["profiles"]) {
  if (Array.isArray(raw)) return raw[0] || null
  return raw || null
}

export async function resolveCampusEmployerMemberIds(opts: {
  university: string
  filters?: CampusEmployerDirectoryFilters
}) {
  const loaded = await loadCampusEmployerDirectory({
    university: opts.university,
    page: 1,
    pageSize: 20000,
    filters: opts.filters,
  })
  return {
    university: loaded.university,
    filters: loaded.filters,
    ids: loaded.employers.map((row) => row.id).filter((id) => !id.startsWith("partner:")),
    total: loaded.selectableTotal,
  }
}

export async function loadCampusEmployerDirectory(opts: {
  university: string
  page?: number
  pageSize?: number
  filters?: CampusEmployerDirectoryFilters
}) {
  const page = Math.max(1, opts.page || 1)
  const pageSize = Math.min(20000, Math.max(1, opts.pageSize || CAMPUS_EMPLOYER_DIRECTORY_PAGE_SIZE))
  const filters = opts.filters || {}
  const university = directoryUniversity(opts.university)
  const admin = createAdminClient()

  const { data: partners, error: partnerError } = await admin
    .from("campus_employer_partners")
    .select("id, company_name, recruiter_id, created_at, tier, notes")
    .eq("university", university)
    .order("created_at", { ascending: false })
    .limit(5000)

  if (partnerError) {
    return {
      employers: [] as CampusDirectoryEmployer[],
      total: 0,
      selectableTotal: 0,
      page,
      pageSize,
      university,
      filters,
      error: partnerError.message,
    }
  }

  const partnerRows = (partners || []) as PartnerRow[]
  const recruiterIds = [...new Set(partnerRows.map((p) => p.recruiter_id).filter(Boolean) as string[])]

  const recruiterMap = new Map<string, RecruiterRow>()
  for (let i = 0; i < recruiterIds.length; i += 100) {
    const chunk = recruiterIds.slice(i, i + 100)
    const { data } = await admin
      .from("recruiter_profiles")
      .select("id, company_name, industry, employee_count, website_url, updated_at, created_at, profiles(full_name, updated_at)")
      .in("id", chunk)
    for (const row of (data || []) as RecruiterRow[]) recruiterMap.set(row.id, row)
  }

  // Deduplicate by recruiter_id when present; keep partner-only rows with synthetic keys
  const seenRecruiters = new Set<string>()
  const baseRows: {
    id: string
    partnerId: string
    name: string
    industry: string | null
    employeeCount: string | null
    websiteUrl: string | null
    linkedinUrl: string | null
    lastActiveAt: string | null
    status: string | null
  }[] = []

  for (const partner of partnerRows) {
    const recruiterId = partner.recruiter_id || null
    if (recruiterId) {
      if (seenRecruiters.has(recruiterId)) continue
      seenRecruiters.add(recruiterId)
      const recruiter = recruiterMap.get(recruiterId)
      const profile = asProfile(recruiter?.profiles)
      const website = recruiter?.website_url || null
      baseRows.push({
        id: recruiterId,
        partnerId: partner.id,
        name: recruiter?.company_name || partner.company_name || "Employer",
        industry: recruiter?.industry || null,
        employeeCount: recruiter?.employee_count || null,
        websiteUrl: website,
        linkedinUrl: linkedinFromWebsite(website),
        lastActiveAt: pickLatest(profile?.updated_at, recruiter?.updated_at, partner.created_at),
        status: "active",
      })
    } else {
      baseRows.push({
        id: `partner:${partner.id}`,
        partnerId: partner.id,
        name: partner.company_name || "Employer",
        industry: null,
        employeeCount: null,
        websiteUrl: null,
        linkedinUrl: null,
        lastActiveAt: pickLatest(partner.created_at),
        status: "active",
      })
    }
  }

  let matched = baseRows

  if (filters.q) {
    const needle = filters.q.toLowerCase()
    matched = matched.filter((row) => row.name.toLowerCase().includes(needle))
  }
  if (filters.industry) {
    matched = matched.filter((row) => (row.industry || "").toLowerCase() === filters.industry!.toLowerCase())
  }
  if (filters.employeeCount) {
    matched = matched.filter((row) => row.employeeCount === filters.employeeCount)
  }
  if (filters.inactiveDays != null) {
    const cutoff = Date.now() - filters.inactiveDays * 24 * 60 * 60 * 1000
    matched = matched.filter((row) => !row.lastActiveAt || Date.parse(row.lastActiveAt) < cutoff)
  }

  const realIds = matched.map((row) => row.id).filter((id) => !id.startsWith("partner:"))
  const [suspended, stats] = await Promise.all([
    disconnectedEmployerIds(university, realIds),
    jobStatsForRecruiters(realIds),
  ])

  // Partner row status "suspended" also marks disconnect even before stats load
  for (const row of matched) {
    if (row.status === "suspended" && !row.id.startsWith("partner:")) suspended.add(row.id)
  }

  if (filters.suspended === "yes") {
    matched = matched.filter((row) => !row.id.startsWith("partner:") && suspended.has(row.id))
  } else if (filters.suspended === "no") {
    matched = matched.filter((row) => row.id.startsWith("partner:") || !suspended.has(row.id))
  }

  const total = matched.length
  const selectableTotal = matched.filter((row) => !row.id.startsWith("partner:")).length
  const from = (page - 1) * pageSize
  const pageRows = matched.slice(from, from + pageSize)

  const employers: CampusDirectoryEmployer[] = pageRows.map((row) => {
    const isPartnerOnly = row.id.startsWith("partner:")
    const lastActiveAt = row.lastActiveAt
    return {
      id: row.id,
      partnerId: row.partnerId,
      name: row.name,
      industry: row.industry,
      employeeCount: row.employeeCount,
      linkedinUrl: row.linkedinUrl,
      websiteUrl: row.websiteUrl,
      jobsPosted: isPartnerOnly ? 0 : stats.jobsPosted.get(row.id) || 0,
      studentsHired: isPartnerOnly ? 0 : stats.studentsHired.get(row.id) || 0,
      lastActiveAt,
      lastActiveLabel: formatLastActive(lastActiveAt),
      suspended: isPartnerOnly
        ? row.status === "suspended"
        : suspended.has(row.id) || row.status === "suspended",
      status: row.status,
    }
  })

  return {
    employers,
    total,
    selectableTotal,
    page,
    pageSize,
    university,
    filters,
    error: null as string | null,
  }
}
