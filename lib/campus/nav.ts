import {
  Bell,
  Briefcase,
  Calendar,
  ClipboardCheck,
  Globe,
  Handshake,
  Inbox,
  BarChart3,
  LayoutDashboard,
  Layers,
  MessageCircle,
  ScrollText,
  Settings,
  Shield,
  Users,
  type LucideIcon,
} from "lucide-react"
import { campusNavScope } from "@/lib/campus/staff-roles"

type CampusCapability =
  | "view_home"
  | "view_advising"
  | "view_events"
  | "view_reports"
  | "view_equity"
  | "view_actions"
  | "view_sso"
  | "export"
  | "mutate"

export type CampusNavLink = { href: string; label: string; capability: CampusCapability; icon?: LucideIcon }

export type CampusNavItem = CampusNavLink & {
  children?: CampusNavLink[]
}

export const CAMPUS_NAV: CampusNavItem[] = [
  { href: "/campus", label: "Home", icon: LayoutDashboard, capability: "view_home" },
  { href: "/campus/pending", label: "Pending Items", icon: Inbox, capability: "view_actions" },
  { href: "/campus/approvals", label: "Approvals", icon: ClipboardCheck, capability: "view_actions" },
  { href: "/campus/jobs", label: "Jobs & Applications", icon: Briefcase, capability: "view_actions" },
  { href: "/campus/collections", label: "Curated Jobs", icon: Layers, capability: "view_actions" },
  {
    href: "/campus/people",
    label: "Partners & Stakeholders",
    icon: Users,
    capability: "view_actions",
    children: [
      { href: "/campus/people?kind=students", label: "Students", capability: "view_actions" },
      { href: "/campus/people?kind=alumni", label: "Alumni", capability: "view_actions" },
      { href: "/campus/employers", label: "Employers", capability: "view_actions" },
    ],
  },
  { href: "/campus/events", label: "Events & Career Fairs", icon: Calendar, capability: "view_events" },
  { href: "/campus/opportunities", label: "International Programs", icon: Globe, capability: "view_actions" },
  { href: "/campus/services", label: "Mentorship & Career Services", icon: Handshake, capability: "view_advising" },
  { href: "/campus/announcements", label: "Announcements", icon: Bell, capability: "view_actions" },
  {
    href: "/campus/reports",
    label: "Reports & Analytics",
    icon: BarChart3,
    capability: "view_reports",
    children: [
      { href: "/campus/reports", label: "Overview", capability: "view_reports" },
      { href: "/campus/market", label: "Job posts", capability: "view_reports" },
      { href: "/campus/engagement", label: "Engagement rates", capability: "view_reports" },
      { href: "/campus/market", label: "Employer activity", capability: "view_reports" },
      { href: "/campus/applications", label: "Student applications", capability: "view_reports" },
      { href: "/campus/outcomes", label: "Placement insights", capability: "view_reports" },
      { href: "/campus/departments", label: "At-risk departments", capability: "view_reports" },
      { href: "/campus/trends", label: "Trends", capability: "view_reports" },
      { href: "/campus/equity", label: "Equity", capability: "view_equity" },
    ],
  },
  { href: "/campus/users", label: "Users & Access", icon: Shield, capability: "view_actions" },
  { href: "/campus/communication", label: "Communication", icon: MessageCircle, capability: "view_actions" },
  { href: "/campus/actions", label: "Actions & Activity Log", icon: ScrollText, capability: "view_actions" },
  { href: "/campus/settings", label: "Settings & Integrations", icon: Settings, capability: "view_sso" },
]

export type CampusNavGroup = { label: string; items: CampusNavLink[] }

function allowed(caps: Set<CampusCapability>, capability: CampusCapability) {
  return caps.has(capability)
}

const SCOPE_CAPS: Record<string, CampusCapability[]> = {
  full: ["view_home", "view_advising", "view_events", "view_reports", "view_equity", "view_actions", "view_sso", "export", "mutate"],
  department: ["view_home", "view_advising", "view_events", "view_reports", "view_equity", "view_actions", "export", "mutate"],
  reports: ["view_home", "view_reports", "view_equity", "export"],
  faculty: ["view_home", "view_advising", "view_events"],
}

export function campusNavForRole(staffRole?: string | null): CampusNavItem[] {
  const scope = staffRole === "admin" ? "full" : campusNavScope(staffRole) || "full"
  const caps = new Set(SCOPE_CAPS[scope] || SCOPE_CAPS.full)
  return CAMPUS_NAV.flatMap((item) => {
    const children = (item.children || []).filter((child) => allowed(caps, child.capability))
    if (!allowed(caps, item.capability) && !children.length) return []
    return [{ ...item, children: children.length ? children : undefined }]
  })
}

/** Flat groups for legacy dropdowns (platform admin on /campus). */
export function campusNavGroups(staffRole?: string | null): CampusNavGroup[] {
  const items = campusNavForRole(staffRole)
  const primary = items
    .filter((item) => !item.children)
    .map((item) => ({ href: item.href, label: item.label, capability: item.capability }))
  const nested = items.filter((item) => item.children?.length)
  const groups: CampusNavGroup[] = [{ label: "CDC", items: primary }]
  for (const item of nested) {
    groups.push({
      label: item.label,
      items: (item.children || []).map(({ href, label, capability }) => ({ href, label, capability })),
    })
  }
  return groups.filter((group) => group.items.length)
}

export const CAMPUS_WORK: CampusNavLink[] = CAMPUS_NAV.filter((item) =>
  ["/campus", "/campus/approvals", "/campus/collections", "/campus/employers", "/campus/services"].includes(item.href)
).map(({ href, label, capability }) => ({ href, label, capability }))

export const CAMPUS_MORE: CampusNavLink[] = CAMPUS_NAV.filter((item) =>
  ["/campus/announcements", "/campus/events", "/campus/opportunities", "/campus/actions", "/campus/settings"].includes(
    item.href
  )
).map(({ href, label, capability }) => ({ href, label, capability }))

export const CAMPUS_REPORTS: CampusNavLink[] =
  CAMPUS_NAV.find((item) => item.href === "/campus/reports")?.children?.map(({ href, label, capability }) => ({
    href,
    label,
    capability,
  })) || []

export function campusPathActive(pathname: string, href: string, search = "") {
  const [path, query] = href.split("?")
  if (path === "/campus") return pathname === "/campus"
  if (query) {
    const kind = new URLSearchParams(query).get("kind")
    const current = new URLSearchParams(search).get("kind") || "students"
    return pathname === path && (!kind || current === kind)
  }
  return pathname === path || pathname.startsWith(`${path}/`)
}
