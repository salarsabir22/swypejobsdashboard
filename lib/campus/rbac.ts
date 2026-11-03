import { redirect } from "next/navigation"
import { getCampusAccess } from "@/lib/campus/access"
import { campusNavScope } from "@/lib/campus/staff-roles"
import type { CampusAccess } from "@/lib/campus/types"

export type CampusCapability =
  | "view_home"
  | "view_advising"
  | "view_events"
  | "view_reports"
  | "view_equity"
  | "view_actions"
  | "view_sso"
  | "export"
  | "mutate"

const ALL: CampusCapability[] = [
  "view_home",
  "view_advising",
  "view_events",
  "view_reports",
  "view_equity",
  "view_actions",
  "view_sso",
  "export",
  "mutate",
]

const SCOPE_CAPS: Record<string, CampusCapability[]> = {
  full: ALL,
  department: ALL.filter((cap) => cap !== "view_sso"),
  reports: ["view_home", "view_reports", "view_equity", "export"],
  faculty: ["view_home", "view_advising", "view_events"],
}

export function campusCapabilities(access: CampusAccess) {
  if (access.role === "admin" || access.staffRole === "admin") return new Set(ALL)
  const scope = campusNavScope(access.staffRole)
  return new Set(SCOPE_CAPS[scope] || SCOPE_CAPS.faculty)
}

export function canCampus(access: CampusAccess, capability: CampusCapability) {
  return campusCapabilities(access).has(capability)
}

export function scopedCampus(access: CampusAccess, requested?: string | null) {
  const next = requested?.trim() || ""
  if (access.role === "admin") return next || access.university
  return access.university
}

export async function requireCampusCapability(capability: CampusCapability) {
  const access = await getCampusAccess()
  if (!canCampus(access, capability)) redirect("/campus")
  return access
}
