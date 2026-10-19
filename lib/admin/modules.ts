/** Nav/module keys used for RBAC. `all` unlocks everything. */
export type AdminModule =
  | "all"
  | "home"
  | "employers"
  | "jobs"
  | "safety"
  | "users"
  | "universities"
  | "matching"
  | "comms"
  | "channels"
  | "analytics"
  | "team"
  | "billing"
  | "alerts"
  | "integrations"
  | "compliance"

export type AdminStaffRole = "super_admin" | "moderator" | "support" | "analyst" | "finance" | "readonly"

export const MODULE_BY_PATH: Record<string, AdminModule> = {
  "/admin": "home",
  "/admin/employers": "employers",
  "/admin/jobs": "jobs",
  "/admin/safety": "safety",
  "/admin/users": "users",
  "/admin/universities": "universities",
  "/admin/matching": "matching",
  "/admin/comms": "comms",
  "/admin/channels": "channels",
  "/admin/analytics": "analytics",
  "/admin/team": "team",
  "/admin/billing": "billing",
  "/admin/alerts": "alerts",
  "/admin/integrations": "integrations",
  "/admin/compliance": "compliance",
}

export const DEFAULT_MODULES_BY_ROLE: Record<AdminStaffRole, AdminModule[]> = {
  super_admin: ["all"],
  moderator: [
    "home",
    "employers",
    "jobs",
    "safety",
    "users",
    "universities",
    "comms",
    "channels",
    "alerts",
    "integrations",
    "team",
  ],
  support: ["home", "users", "safety", "comms", "channels"],
  analyst: ["home", "analytics", "matching", "billing", "integrations"],
  finance: ["home", "billing", "analytics", "employers"],
  readonly: ["home", "analytics", "billing", "compliance", "integrations"],
}

export function normalizeModules(modules: string[] | null | undefined, role: AdminStaffRole): AdminModule[] {
  if (modules?.includes("all")) return ["all"]
  if (modules?.length) return modules as AdminModule[]
  return DEFAULT_MODULES_BY_ROLE[role] || ["home"]
}

export function canAccessModule(modules: string[], module: AdminModule): boolean {
  if (modules.includes("all")) return true
  if (module === "home") return true
  return modules.includes(module)
}

export function moduleForPath(pathname: string): AdminModule {
  if (pathname === "/admin") return "home"
  const hit = Object.keys(MODULE_BY_PATH)
    .filter((p) => p !== "/admin")
    .sort((a, b) => b.length - a.length)
    .find((p) => pathname.startsWith(p))
  return hit ? MODULE_BY_PATH[hit] : "home"
}
