import { IOBM_STAFF_ROLES, staffRoleOf, type IobmStaffRoleId } from "@/lib/sso/iobm"

export const CAMPUS_STAFF_ROLES = IOBM_STAFF_ROLES
export type CampusStaffRole = IobmStaffRoleId

const STAFF_NAV = {
  director: "full",
  advisor: "full",
  coordinator: "department",
  dean: "full",
  faculty: "faculty",
  auditor: "reports",
} as const

export function campusNavScope(staffRole: string | null | undefined) {
  const id = staffRoleOf(staffRole)
  return STAFF_NAV[id]
}

/** Auditor is reports-only and must not search student records. */
export function campusStaffCanSearch(staffRole?: string | null, isPlatformAdmin = false) {
  if (isPlatformAdmin) return true
  return campusNavScope(staffRole) !== "reports"
}

export { staffRoleOf }
