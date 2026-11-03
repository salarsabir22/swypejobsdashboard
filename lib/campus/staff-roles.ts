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

export { staffRoleOf }
