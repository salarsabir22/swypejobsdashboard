import { createAdminClient } from "@/lib/supabase/admin"
import {
  directoryUniversity,
  summarizeDirectoryFilters,
  type CampusDirectoryFilters,
} from "@/lib/campus/directory"
import {
  summarizeEmployerDirectoryFilters,
  type CampusEmployerDirectoryFilters,
} from "@/lib/campus/employer-directory"

export const CAMPUS_GROUP_PATH_PREFIX = "__campus_directory_group__"

export type CampusDirectoryGroupKind = "students" | "alumni" | "employers"

export type CampusDirectoryGroupPayload = {
  type: "campus_directory_group"
  university: string
  kind: CampusDirectoryGroupKind
  memberIds: string[]
  memberCount: number
  sourceFilters: CampusDirectoryFilters | CampusEmployerDirectoryFilters
  summary: string[]
  description?: string | null
  mode: "filter" | "selection"
}

export type CampusDirectoryGroup = {
  id: string
  name: string
  createdBy: string
  createdAt: string
  university: string
  kind: CampusDirectoryGroupKind
  memberCount: number
  memberIds: string[]
  sourceFilters: CampusDirectoryFilters | CampusEmployerDirectoryFilters
  summary: string[]
  description: string | null
  mode: "filter" | "selection"
}

function groupPath(university: string, kind: CampusDirectoryGroupKind) {
  return `${CAMPUS_GROUP_PATH_PREFIX}/${directoryUniversity(university)}/${kind}`
}

function parseKind(value: unknown, path: string): CampusDirectoryGroupKind {
  if (value === "alumni" || value === "employers" || value === "students") return value
  if (path.endsWith("/alumni")) return "alumni"
  if (path.endsWith("/employers")) return "employers"
  return "students"
}

function summarizeForKind(kind: CampusDirectoryGroupKind, filters: CampusDirectoryGroupPayload["sourceFilters"]) {
  if (kind === "employers") return summarizeEmployerDirectoryFilters(filters as CampusEmployerDirectoryFilters)
  return summarizeDirectoryFilters(filters as CampusDirectoryFilters)
}

function parseGroup(row: {
  id: string
  name: string
  user_id: string
  path: string
  filters: unknown
  created_at?: string | null
}): CampusDirectoryGroup | null {
  const filters = (row.filters && typeof row.filters === "object" ? row.filters : {}) as Partial<CampusDirectoryGroupPayload>
  if (filters.type !== "campus_directory_group") return null
  const memberIds = Array.isArray(filters.memberIds)
    ? filters.memberIds.filter((id): id is string => typeof id === "string" && Boolean(id.trim()))
    : []
  const university = filters.university || row.path.split("/")[1] || ""
  const kind = parseKind(filters.kind, row.path)
  const sourceFilters = (filters.sourceFilters || {}) as CampusDirectoryGroupPayload["sourceFilters"]
  return {
    id: row.id,
    name: row.name,
    createdBy: row.user_id,
    createdAt: row.created_at || new Date().toISOString(),
    university,
    kind,
    memberCount: typeof filters.memberCount === "number" ? filters.memberCount : memberIds.length,
    memberIds,
    sourceFilters,
    summary: Array.isArray(filters.summary) ? filters.summary.map(String) : summarizeForKind(kind, sourceFilters),
    description: typeof filters.description === "string" ? filters.description : null,
    mode: filters.mode === "selection" ? "selection" : "filter",
  }
}

export async function listCampusDirectoryGroups(opts: {
  university: string
  kind?: CampusDirectoryGroupKind
  limit?: number
}) {
  const admin = createAdminClient()
  const university = directoryUniversity(opts.university)
  const prefix = opts.kind
    ? groupPath(university, opts.kind)
    : `${CAMPUS_GROUP_PATH_PREFIX}/${university}`

  const { data, error } = await admin
    .from("campus_saved_views")
    .select("id, name, user_id, path, filters, created_at")
    .like("path", `${prefix}%`)
    .order("created_at", { ascending: false })
    .limit(opts.limit || 100)

  if (error) throw new Error(error.message)

  return (data || [])
    .map((row) => parseGroup(row))
    .filter((row): row is CampusDirectoryGroup => Boolean(row))
}

export async function getCampusDirectoryGroup(id: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from("campus_saved_views")
    .select("id, name, user_id, path, filters, created_at")
    .eq("id", id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null
  return parseGroup(data)
}

export async function createCampusDirectoryGroup(opts: {
  userId: string
  name: string
  description?: string | null
  university: string
  kind: CampusDirectoryGroupKind
  memberIds: string[]
  sourceFilters: CampusDirectoryFilters | CampusEmployerDirectoryFilters
  mode: "filter" | "selection"
}) {
  const admin = createAdminClient()
  const university = directoryUniversity(opts.university)
  const name = opts.name.trim()
  if (!name) throw new Error("Group name is required.")
  const memberIds = [...new Set(opts.memberIds.filter((id) => id && !id.startsWith("partner:")))]
  if (!memberIds.length) throw new Error("A group needs at least one member with an account.")

  const payload: CampusDirectoryGroupPayload = {
    type: "campus_directory_group",
    university,
    kind: opts.kind,
    memberIds,
    memberCount: memberIds.length,
    sourceFilters: opts.sourceFilters,
    summary: summarizeForKind(opts.kind, opts.sourceFilters),
    description: opts.description?.trim() || null,
    mode: opts.mode,
  }

  const { data, error } = await admin
    .from("campus_saved_views")
    .insert({
      user_id: opts.userId,
      name,
      path: groupPath(university, opts.kind),
      filters: payload,
    })
    .select("id, name, user_id, path, filters, created_at")
    .single()

  if (error) throw new Error(error.message)
  const group = parseGroup(data)
  if (!group) throw new Error("Could not create group.")
  return group
}

export async function deleteCampusDirectoryGroup(opts: { id: string; university: string }) {
  const admin = createAdminClient()
  const group = await getCampusDirectoryGroup(opts.id)
  if (!group) throw new Error("Group not found.")
  if (directoryUniversity(group.university) !== directoryUniversity(opts.university)) {
    throw new Error("That group is not in your campus.")
  }
  const { error } = await admin.from("campus_saved_views").delete().eq("id", opts.id)
  if (error) throw new Error(error.message)
  return true
}
