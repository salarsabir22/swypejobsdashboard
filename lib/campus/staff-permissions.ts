import type { CampusCapability } from "@/lib/campus/rbac"
import type { CampusAccess } from "@/lib/campus/types"

/**
 * Named CDC access switches shown on Users & access.
 *
 * Each switch maps onto one or more existing campus capabilities, so the rest of
 * the console keeps gating on capabilities and never needs a second matrix.
 * A staff member with `access_grants` set gets exactly the union of these
 * capabilities (plus `view_home`, which keeps the console shell usable).
 */
export type StaffPermission = {
  id: string
  label: string
  description: string
  capabilities: CampusCapability[]
}

export const STAFF_PERMISSIONS: StaffPermission[] = [
  {
    id: "approvals",
    label: "Job approvals",
    description: "Review, hold, and approve employer job posts. Also opens the job and application queues.",
    capabilities: ["view_actions", "mutate"],
  },
  {
    id: "directory",
    label: "Student & employer directory",
    description: "Browse students, alumni, employer partners, and curated job lists.",
    capabilities: ["view_actions"],
  },
  {
    id: "events",
    label: "Events & career fairs",
    description: "Create and manage campus events, RSVPs, and announcements.",
    capabilities: ["view_events"],
  },
  {
    id: "international",
    label: "International programs",
    description: "Publish and edit study abroad, exchange, dual degree, and scholarship listings.",
    capabilities: ["view_international"],
  },
  {
    id: "reports",
    label: "Reports & analytics",
    description: "Open CDC reports and export CSV, Excel, and PDF files.",
    capabilities: ["view_reports", "export"],
  },
  {
    id: "equity",
    label: "Equity dashboards",
    description: "See consented demographic breakdowns and equity gap flags.",
    capabilities: ["view_equity"],
  },
]

const PERMISSION_BY_ID = new Map(STAFF_PERMISSIONS.map((row) => [row.id, row]))

export function isKnownPermission(id: string) {
  return PERMISSION_BY_ID.has(id)
}

/** Permission ids → campus capabilities (always includes view_home). */
export function capabilitiesFromPermissions(ids: string[]): CampusCapability[] {
  const caps = new Set<CampusCapability>(["view_home"])
  for (const id of ids) {
    const row = PERMISSION_BY_ID.get(id)
    for (const cap of row?.capabilities || []) caps.add(cap)
  }
  return [...caps]
}

/** Capability set → permission ids that are fully satisfied (for the toggle UI). */
export function permissionsFromCapabilities(caps: string[] | null | undefined): string[] {
  if (!caps?.length) return []
  const have = new Set(caps)
  return STAFF_PERMISSIONS.filter((row) => row.capabilities.every((cap) => have.has(cap))).map((row) => row.id)
}

/** Directors and platform admins control every switch; nobody else can edit access. */
export function canManageStaffAccess(access: CampusAccess) {
  return access.role === "admin" || access.staffRole === "director" || access.staffRole === "admin"
}

/** The director seat itself is never restricted, so a campus can't lock itself out. */
export function isProtectedStaffRole(staffRole: string | null | undefined) {
  return staffRole === "director" || staffRole === "admin"
}
