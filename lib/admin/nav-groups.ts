import type { AdminModule } from "@/lib/admin/modules"

export type AdminNavLink = {
  href: string
  label: string
  module: AdminModule
  exact?: boolean
}

export type AdminNavGroup = {
  label: string
  links: AdminNavLink[]
}

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    label: "Queues",
    links: [
      { href: "/admin", label: "Home", module: "home", exact: true },
      { href: "/admin/employers", label: "Employers", module: "employers" },
      { href: "/admin/jobs", label: "Jobs", module: "jobs" },
      { href: "/admin/safety", label: "Safety", module: "safety" },
      { href: "/admin/users", label: "Users", module: "users" },
      { href: "/admin/universities", label: "Universities", module: "universities" },
    ],
  },
  {
    label: "Growth",
    links: [
      { href: "/admin/matching", label: "Matching", module: "matching" },
      { href: "/admin/comms", label: "Comms", module: "comms" },
      { href: "/admin/channels", label: "Channels", module: "channels" },
      { href: "/admin/analytics", label: "Analytics", module: "analytics" },
    ],
  },
  {
    label: "Platform",
    links: [
      { href: "/admin/team", label: "Team", module: "team" },
      { href: "/admin/billing", label: "Billing", module: "billing" },
      { href: "/admin/alerts", label: "Alerts", module: "alerts" },
      { href: "/admin/integrations", label: "Integrations", module: "integrations" },
      { href: "/admin/compliance", label: "Compliance", module: "compliance" },
    ],
  },
]
