import { createAdminClient } from "@/lib/supabase/admin"
import { studentCompleteness } from "@/lib/profile/completeness"
import { parseWorkHistory } from "@/lib/profile/career"
import { studentIsAlumni } from "@/lib/jobs/targeting"
import { IOBM_UNIVERSITY_NAME } from "@/lib/sso/iobm"
import { IOBM_COLLEGES, iobmCollegeById, iobmCollegeByName } from "@/lib/sso/iobm-programs"
import { canonicalizeUniversity } from "@/lib/campus/student-campus"
import { listDisconnectedSubjectIds } from "@/lib/campus/partnership"

export const CAMPUS_DIRECTORY_PAGE_SIZE = 50

export type CampusDirectoryKind = "students" | "alumni" | "employers" | "groups"

export type CampusDirectoryStudent = {
  id: string
  name: string
  campusStudentId: string | null
  program: string | null
  college: string | null
  classYear: number | null
  completionPercent: number
  lastActiveAt: string | null
  lastActiveLabel: string
  suspended: boolean
  isAlumni: boolean
  currentlyEmployed: boolean
}

export type CampusDirectoryFilters = {
  q?: string
  college?: string
  program?: string
  classYear?: number | null
  /** Profile completion: percent threshold with lt / gte */
  completionOp?: "lt" | "gte" | null
  completionValue?: number | null
  /** Inactive if last activity older than this many days (or never). */
  inactiveDays?: number | null
  employed?: "yes" | "no" | null
  suspended?: "yes" | "no" | null
}

type ProfileJoin = {
  full_name?: string | null
  avatar_url?: string | null
  bio?: string | null
  profile_video_url?: string | null
  updated_at?: string | null
} | null

type StudentRow = {
  id: string
  degree?: string | null
  college?: string | null
  campus_student_id?: string | null
  graduation_year?: number | null
  university?: string | null
  skills?: string[] | null
  resume_url?: string | null
  linkedin_url?: string | null
  still_enrolled?: boolean | null
  is_alumni?: boolean | null
  work_history?: unknown
  projects?: unknown
  updated_at?: string | null
  profiles?: ProfileJoin | ProfileJoin[]
}

const SELECT_FULL =
  "id, degree, college, campus_student_id, graduation_year, university, skills, resume_url, linkedin_url, still_enrolled, is_alumni, work_history, projects, updated_at, profiles!inner(full_name, avatar_url, bio, profile_video_url, updated_at)"
const SELECT_BASIC =
  "id, degree, college, campus_student_id, graduation_year, university, skills, resume_url, linkedin_url, still_enrolled, is_alumni, work_history, projects, updated_at, profiles!inner(full_name, avatar_url, bio, updated_at)"

function asProfile(raw: StudentRow["profiles"]): ProfileJoin {
  if (Array.isArray(raw)) return raw[0] || null
  return raw || null
}

function hasJsonRows(value: unknown) {
  return Array.isArray(value) && value.length > 0
}

export function formatLastActive(iso: string | null | undefined) {
  if (!iso) return "Never"
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "Never"
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}

export function directoryUniversity(name: string | null | undefined) {
  const value = canonicalizeUniversity(name) || name?.trim() || ""
  return value || IOBM_UNIVERSITY_NAME
}

function completionFor(row: StudentRow, profile: ProfileJoin) {
  return studentCompleteness({
    avatar: profile?.avatar_url,
    bio: profile?.bio,
    university: row.university,
    skills: row.skills,
    resume: row.resume_url,
    video: profile?.profile_video_url,
    linkedin: row.linkedin_url,
    experience: hasJsonRows(row.work_history),
    projects: hasJsonRows(row.projects),
  }).percent
}

function isCurrentlyEmployed(workHistory: unknown) {
  return parseWorkHistory(workHistory).some((row) => row.current)
}

function resolveCollegeName(value: string | null | undefined) {
  if (!value?.trim()) return null
  const byId = iobmCollegeById(value.trim())
  if (byId) return byId.name
  const byName = iobmCollegeByName(value)
  return byName?.name || value.trim()
}

function clampPercent(n: number) {
  if (!Number.isFinite(n)) return null
  return Math.min(100, Math.max(0, Math.round(n)))
}

function clampDays(n: number) {
  if (!Number.isFinite(n) || n < 1) return null
  return Math.min(3650, Math.round(n))
}

/** Parse directory query-string filters from the people page. */
export function parseCampusDirectoryFilters(
  params: Record<string, string | string[] | undefined>
): CampusDirectoryFilters {
  const get = (key: string) => {
    const raw = params[key]
    return typeof raw === "string" ? raw.trim() : ""
  }

  const q = get("q")
  const college = resolveCollegeName(get("college")) || undefined
  const program = get("program") || undefined
  const classRaw = get("class")
  const classYear = classRaw ? Number.parseInt(classRaw, 10) : null

  let completionOp: CampusDirectoryFilters["completionOp"] = null
  let completionValue: number | null = null
  const completion = get("completion")
  if (completion === "below60") {
    completionOp = "lt"
    completionValue = 60
  } else if (completion === "above60") {
    completionOp = "gte"
    completionValue = 60
  } else if (completion === "custom") {
    const op = get("completion_op")
    completionOp = op === "gte" ? "gte" : "lt"
    completionValue = clampPercent(Number.parseFloat(get("completion_n")))
  }

  let inactiveDays: number | null = null
  const inactive = get("inactive")
  if (inactive === "15" || inactive === "30" || inactive === "45") {
    inactiveDays = Number(inactive)
  } else if (inactive === "custom") {
    inactiveDays = clampDays(Number.parseFloat(get("inactive_n")))
  }

  const employedRaw = get("employed")
  const employed = employedRaw === "yes" || employedRaw === "no" ? employedRaw : null
  const suspendedRaw = get("suspended")
  const suspended = suspendedRaw === "yes" || suspendedRaw === "no" ? suspendedRaw : null

  return {
    q: q || undefined,
    college,
    program,
    classYear: Number.isFinite(classYear) && classYear !== null ? classYear : null,
    completionOp: completionValue != null ? completionOp : null,
    completionValue,
    inactiveDays,
    employed,
    suspended,
  }
}

export function directoryNeedsScan(filters: CampusDirectoryFilters) {
  return Boolean(
    filters.completionOp ||
      filters.completionValue != null ||
      filters.inactiveDays != null ||
      filters.employed ||
      filters.suspended
  )
}

async function lastSignInMap(ids: string[]) {
  const map = new Map<string, string | null>()
  if (!ids.length) return map
  const admin = createAdminClient()
  await Promise.all(
    ids.map(async (id) => {
      try {
        const { data } = await admin.auth.admin.getUserById(id)
        map.set(id, data.user?.last_sign_in_at || null)
      } catch {
        map.set(id, null)
      }
    })
  )
  return map
}

async function latestSwipeMap(ids: string[]) {
  const map = new Map<string, string>()
  if (!ids.length) return map
  const admin = createAdminClient()
  // Chunk to stay under PostgREST URL / IN limits
  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200)
    const { data } = await admin
      .from("job_swipes")
      .select("student_id, created_at")
      .in("student_id", chunk)
      .order("created_at", { ascending: false })
      .limit(Math.min(chunk.length * 3, 600))
    for (const row of data || []) {
      if (!map.has(row.student_id)) map.set(row.student_id, row.created_at)
    }
  }
  return map
}

async function disconnectedStudentIds(university: string, ids?: string[]) {
  const disconnected = await listDisconnectedSubjectIds({ university, subject: "student" })
  if (!ids) return disconnected
  const set = new Set<string>()
  for (const id of ids) {
    if (disconnected.has(id)) set.add(id)
  }
  return set
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

/** Search by student name or campus student ID. */
async function resolveSearchIds(university: string, q: string) {
  const admin = createAdminClient()
  const needle = q.trim()
  if (!needle) return null

  const [{ data: byName }, { data: byId }] = await Promise.all([
    admin.from("profiles").select("id, full_name").ilike("full_name", `%${needle}%`).limit(400),
    admin
      .from("student_profiles")
      .select("id")
      .eq("university", university)
      .ilike("campus_student_id", `%${needle}%`)
      .limit(400),
  ])

  return [...new Set([...(byName || []).map((r) => r.id), ...(byId || []).map((r) => r.id)])]
}

function applySqlFilters(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  builder: any,
  opts: {
    kind: "students" | "alumni"
    searchIds: string[] | null
    filters: CampusDirectoryFilters
  }
) {
  let next = builder
  if (opts.kind === "alumni") next = next.eq("is_alumni", true)
  else next = next.or("is_alumni.is.null,is_alumni.eq.false")

  if (opts.searchIds?.length) next = next.in("id", opts.searchIds.slice(0, 400))
  if (opts.filters.college) next = next.eq("college", opts.filters.college)
  if (opts.filters.program) next = next.eq("degree", opts.filters.program)
  if (opts.filters.classYear != null) next = next.eq("graduation_year", opts.filters.classYear)

  return next
}

function matchesComputedFilters(
  row: StudentRow,
  profile: ProfileJoin,
  opts: {
    filters: CampusDirectoryFilters
    swipeAt?: string | null
    suspended: boolean
  }
) {
  const { filters } = opts
  const percent = completionFor(row, profile)

  if (filters.completionOp && filters.completionValue != null) {
    if (filters.completionOp === "lt" && !(percent < filters.completionValue)) return false
    if (filters.completionOp === "gte" && !(percent >= filters.completionValue)) return false
  }

  if (filters.employed === "yes" && !isCurrentlyEmployed(row.work_history)) return false
  if (filters.employed === "no" && isCurrentlyEmployed(row.work_history)) return false

  if (filters.inactiveDays != null) {
    const last = pickLatest(opts.swipeAt, profile?.updated_at, row.updated_at)
    const cutoff = Date.now() - filters.inactiveDays * 24 * 60 * 60 * 1000
    const inactive = !last || Date.parse(last) < cutoff
    if (!inactive) return false
  }

  if (filters.suspended === "yes" && !opts.suspended) return false
  if (filters.suspended === "no" && opts.suspended) return false

  return true
}

function toDirectoryStudent(
  row: StudentRow,
  opts: {
    lastActiveAt: string | null
    suspended: boolean
  }
): CampusDirectoryStudent {
  const profile = asProfile(row.profiles)
  return {
    id: row.id,
    name: profile?.full_name || "Student",
    campusStudentId: row.campus_student_id || null,
    program: row.degree || null,
    college: row.college || null,
    classYear: row.graduation_year ?? null,
    completionPercent: completionFor(row, profile),
    lastActiveAt: opts.lastActiveAt,
    lastActiveLabel: formatLastActive(opts.lastActiveAt),
    suspended: opts.suspended,
    isAlumni: studentIsAlumni(row),
    currentlyEmployed: isCurrentlyEmployed(row.work_history),
  }
}

async function queryPage(opts: {
  university: string
  kind: "students" | "alumni"
  from: number
  to: number
  searchIds: string[] | null
  filters: CampusDirectoryFilters
}) {
  const admin = createAdminClient()

  async function run(select: string) {
    let builder = admin
      .from("student_profiles")
      .select(select, { count: "exact" })
      .eq("university", opts.university)
      .order("updated_at", { ascending: false })
      .range(opts.from, opts.to)
    builder = applySqlFilters(builder, {
      kind: opts.kind,
      searchIds: opts.searchIds,
      filters: opts.filters,
    })
    return builder
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let result: { data: any; error: { message: string } | null; count: number | null } = await run(SELECT_FULL)
  if (result.error) result = await run(SELECT_BASIC)
  if (result.error && /is_alumni/i.test(result.error.message)) {
    let builder = admin
      .from("student_profiles")
      .select(SELECT_BASIC, { count: "exact" })
      .eq("university", opts.university)
      .order("updated_at", { ascending: false })
      .range(opts.from, opts.to)
    if (opts.searchIds?.length) builder = builder.in("id", opts.searchIds.slice(0, 400))
    if (opts.filters.college) builder = builder.eq("college", opts.filters.college)
    if (opts.filters.program) builder = builder.eq("degree", opts.filters.program)
    if (opts.filters.classYear != null) builder = builder.eq("graduation_year", opts.filters.classYear)
    result = await builder
  }
  return result
}

async function fetchAllMatchingRows(opts: {
  university: string
  kind: "students" | "alumni"
  searchIds: string[] | null
  filters: CampusDirectoryFilters
}) {
  const admin = createAdminClient()
  const pageSize = 1000
  const all: StudentRow[] = []
  let offset = 0
  let select = SELECT_FULL

  while (offset < 20000) {
    let builder = admin
      .from("student_profiles")
      .select(select)
      .eq("university", opts.university)
      .order("updated_at", { ascending: false })
      .range(offset, offset + pageSize - 1)
    builder = applySqlFilters(builder, {
      kind: opts.kind,
      searchIds: opts.searchIds,
      filters: opts.filters,
    })
    const { data, error } = await builder
    if (error && select === SELECT_FULL) {
      select = SELECT_BASIC
      continue
    }
    if (error) break
    const rows = (data || []) as unknown as StudentRow[]
    if (!rows.length) break
    all.push(...rows)
    if (rows.length < pageSize) break
    offset += pageSize
  }

  return all.filter((row) => (opts.kind === "alumni" ? studentIsAlumni(row) : !studentIsAlumni(row)))
}

export function directoryClassYearOptions() {
  const y = new Date().getFullYear()
  return Array.from({ length: 14 }, (_, i) => String(y - 7 + i))
}

export function directoryCollegeOptions() {
  return IOBM_COLLEGES.map((c) => ({ id: c.id, name: c.name, shortName: c.shortName, programs: c.programs }))
}

export function summarizeDirectoryFilters(filters: CampusDirectoryFilters): string[] {
  const parts: string[] = []
  if (filters.q) parts.push(`“${filters.q}”`)
  if (filters.college) parts.push(filters.college)
  if (filters.program) parts.push(filters.program)
  if (filters.classYear) parts.push(`class ${filters.classYear}`)
  if (filters.completionOp && filters.completionValue != null) {
    parts.push(
      filters.completionOp === "lt"
        ? `completion < ${filters.completionValue}%`
        : `completion ≥ ${filters.completionValue}%`
    )
  }
  if (filters.inactiveDays) parts.push(`inactive ${filters.inactiveDays}+ days`)
  if (filters.employed === "yes") parts.push("employed")
  if (filters.employed === "no") parts.push("not employed")
  if (filters.suspended === "yes") parts.push("disconnected from campus")
  if (filters.suspended === "no") parts.push("active campus partners")
  return parts
}

export function suggestDirectoryGroupName(filters: CampusDirectoryFilters, kind: "students" | "alumni") {
  const parts = summarizeDirectoryFilters(filters)
  if (filters.program) return filters.program
  if (filters.inactiveDays) return `Inactive ${filters.inactiveDays}+ days`
  if (filters.completionOp && filters.completionValue != null) {
    return filters.completionOp === "lt"
      ? `Profile below ${filters.completionValue}%`
      : `Profile ${filters.completionValue}%+`
  }
  if (filters.employed === "yes") return "Currently employed"
  if (filters.employed === "no") return "Not employed"
  if (filters.classYear) return `Class of ${filters.classYear}`
  if (filters.college) {
    const short = IOBM_COLLEGES.find((c) => c.name === filters.college)?.shortName
    return short || filters.college
  }
  if (filters.suspended === "yes") return "Disconnected from campus"
  if (parts.length) return parts.slice(0, 2).join(" · ")
  return kind === "alumni" ? "All alumni" : "All students"
}

async function matchDirectoryRows(opts: {
  university: string
  kind: "students" | "alumni"
  filters: CampusDirectoryFilters
}) {
  const university = directoryUniversity(opts.university)
  const filters = opts.filters
  const q = filters.q?.trim() || ""
  const searchIds = q ? await resolveSearchIds(university, q) : null
  if (q && searchIds && searchIds.length === 0) {
    return { university, filters, rows: [] as StudentRow[], swipes: new Map<string, string>(), suspended: new Set<string>() }
  }

  if (!directoryNeedsScan(filters)) {
    // For ID resolution / full match without computed filters, page through SQL results
    const all: StudentRow[] = []
    let offset = 0
    while (offset < 20000) {
      const result = await queryPage({
        university,
        kind: opts.kind,
        from: offset,
        to: offset + 999,
        searchIds,
        filters,
      })
      const rows = ((result.data || []) as unknown as StudentRow[]).filter((row) =>
        opts.kind === "alumni" ? studentIsAlumni(row) : !studentIsAlumni(row)
      )
      if (!rows.length) break
      all.push(...rows)
      if (rows.length < 1000) break
      offset += 1000
    }
    const ids = all.map((r) => r.id)
    const [suspended, swipes] = await Promise.all([disconnectedStudentIds(university, ids), latestSwipeMap(ids)])
    return { university, filters, rows: all, swipes, suspended }
  }

  const allRows = await fetchAllMatchingRows({
    university,
    kind: opts.kind,
    searchIds,
    filters,
  })
  const allIds = allRows.map((r) => r.id)
  const [suspended, swipes] = await Promise.all([disconnectedStudentIds(university, allIds), latestSwipeMap(allIds)])
  const rows = allRows.filter((row) => {
    const profile = asProfile(row.profiles)
    return matchesComputedFilters(row, profile, {
      filters,
      swipeAt: swipes.get(row.id) || null,
      suspended: suspended.has(row.id),
    })
  })
  return { university, filters, rows, swipes, suspended }
}

/** Resolve every student/alumni id matching the current directory filters (for group creation). */
export async function resolveCampusDirectoryMemberIds(opts: {
  university: string
  kind: "students" | "alumni"
  filters?: CampusDirectoryFilters
}) {
  const filters: CampusDirectoryFilters = { ...(opts.filters || {}) }
  const matched = await matchDirectoryRows({
    university: opts.university,
    kind: opts.kind,
    filters,
  })
  return {
    university: matched.university,
    filters: matched.filters,
    ids: matched.rows.map((row) => row.id),
    total: matched.rows.length,
  }
}

export async function loadCampusStudentDirectory(opts: {
  university: string
  kind: "students" | "alumni"
  page?: number
  filters?: CampusDirectoryFilters
  /** @deprecated prefer filters.q */
  q?: string
}) {
  const page = Math.max(1, opts.page || 1)
  const filters: CampusDirectoryFilters = {
    ...(opts.filters || {}),
    q: opts.filters?.q ?? opts.q,
  }
  const q = filters.q?.trim() || ""
  const from = (page - 1) * CAMPUS_DIRECTORY_PAGE_SIZE
  const university = directoryUniversity(opts.university)

  const searchIds = q ? await resolveSearchIds(university, q) : null
  if (q && searchIds && searchIds.length === 0) {
    return { students: [], total: 0, page, pageSize: CAMPUS_DIRECTORY_PAGE_SIZE, university, filters }
  }

  const needsScan = directoryNeedsScan(filters)

  if (!needsScan) {
    const result = await queryPage({
      university,
      kind: opts.kind,
      from,
      to: from + CAMPUS_DIRECTORY_PAGE_SIZE - 1,
      searchIds,
      filters,
    })

    const rows = ((result.data || []) as unknown as StudentRow[]).filter((row) =>
      opts.kind === "alumni" ? studentIsAlumni(row) : !studentIsAlumni(row)
    )
    const ids = rows.map((r) => r.id)
    const [suspended, signIns, swipes] = await Promise.all([
      disconnectedStudentIds(university, ids),
      lastSignInMap(ids),
      latestSwipeMap(ids),
    ])

    const students = rows.map((row) => {
      const profile = asProfile(row.profiles)
      const lastActiveAt = pickLatest(signIns.get(row.id), swipes.get(row.id), profile?.updated_at, row.updated_at)
      return toDirectoryStudent(row, { lastActiveAt, suspended: suspended.has(row.id) })
    })

    return {
      students,
      total: result.count || students.length,
      page,
      pageSize: CAMPUS_DIRECTORY_PAGE_SIZE,
      university,
      filters,
    }
  }

  const matched = await matchDirectoryRows({ university, kind: opts.kind, filters })
  const pageRows = matched.rows.slice(from, from + CAMPUS_DIRECTORY_PAGE_SIZE)
  const pageIds = pageRows.map((r) => r.id)
  const signIns = await lastSignInMap(pageIds)

  const students = pageRows.map((row) => {
    const profile = asProfile(row.profiles)
    const lastActiveAt = pickLatest(
      signIns.get(row.id),
      matched.swipes.get(row.id),
      profile?.updated_at,
      row.updated_at
    )
    return toDirectoryStudent(row, { lastActiveAt, suspended: matched.suspended.has(row.id) })
  })

  return {
    students,
    total: matched.rows.length,
    page,
    pageSize: CAMPUS_DIRECTORY_PAGE_SIZE,
    university,
    filters,
  }
}
