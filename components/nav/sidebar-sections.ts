import {
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  CreditCard,
  GitMerge,
  GraduationCap,
  Layers,
  LayoutDashboard,
  Megaphone,
  Puzzle,
  Radio,
  Scale,
  School,
  Shield,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react"
import { canAccessModule } from "@/lib/admin/modules"
import { ADMIN_NAV_GROUPS } from "@/lib/admin/nav-groups"
import { campusNavForRole, type CampusNavItem } from "@/lib/campus/nav"
import { alumniNavGroups, recruiterNavGroups, studentNavGroups, type NavGroup } from "@/components/nav/app-nav-config"
import type { UserRole } from "@/types"

export type SidebarLink = {
  href: string
  label: string
  icon?: LucideIcon
  exact?: boolean
}

export type SidebarItem = SidebarLink & {
  children?: SidebarLink[]
}

export type SidebarSection = {
  label?: string
  items: SidebarItem[]
}

const ADMIN_ICONS: Record<string, LucideIcon> = {
  "/admin": LayoutDashboard,
  "/admin/employers": Building2,
  "/admin/jobs": Briefcase,
  "/admin/safety": Shield,
  "/admin/users": Users,
  "/admin/universities": GraduationCap,
  "/admin/matching": GitMerge,
  "/admin/comms": Megaphone,
  "/admin/channels": Radio,
  "/admin/analytics": BarChart3,
  "/admin/team": UserCog,
  "/admin/billing": CreditCard,
  "/admin/alerts": Bell,
  "/admin/integrations": Puzzle,
  "/admin/compliance": Scale,
  "/campus": School,
}

function fromCampus(items: CampusNavItem[]): SidebarItem[] {
  return items.map((item) => ({
    href: item.href,
    label: item.label,
    icon: item.icon,
    children: item.children?.map((child) => ({ href: child.href, label: child.label, icon: child.icon })),
  }))
}

function fromGroups(groups: NavGroup[], lead?: SidebarItem): SidebarSection[] {
  const sections: SidebarSection[] = []
  if (lead) sections.push({ items: [lead] })
  for (const group of groups) {
    sections.push({
      label: group.label,
      items: group.items.map((item) => ({ href: item.href, label: item.label, icon: item.icon })),
    })
  }
  return sections
}

const discover: SidebarItem = { href: "/discover", label: "Discover", icon: Layers }

export function sidebarSectionsFor(opts: {
  role: UserRole | "admin"
  isAlumni?: boolean
  staffRole?: string | null
  adminModules?: string[]
  pathname?: string
}): SidebarSection[] {
  const { role, isAlumni, staffRole, adminModules, pathname = "" } = opts
  const onCampus = pathname === "/campus" || pathname.startsWith("/campus/")

  if (role === "university") {
    return [{ items: fromCampus(campusNavForRole(staffRole)) }]
  }

  if (role === "admin") {
    if (onCampus) {
      return [
        { items: [{ href: "/admin", label: "Admin console", icon: Shield }] },
        { items: fromCampus(campusNavForRole("director")) },
      ]
    }
    const modules = adminModules?.length ? adminModules : ["all"]
    const sections: SidebarSection[] = ADMIN_NAV_GROUPS.map((group) => ({
      label: group.label,
      items: group.links
        .filter((link) => canAccessModule(modules, link.module))
        .map((link) => ({
          href: link.href,
          label: link.label,
          icon: ADMIN_ICONS[link.href],
          exact: link.exact,
        })),
    })).filter((section) => section.items.length)
    sections.push({ items: [{ href: "/campus", label: "Campus", icon: School }] })
    return sections
  }

  if (role === "recruiter") return fromGroups(recruiterNavGroups, discover)
  if (isAlumni) return fromGroups(alumniNavGroups, discover)
  return fromGroups(studentNavGroups, discover)
}

export function homeHrefFor(role: UserRole | "admin") {
  if (role === "admin") return "/admin"
  if (role === "university") return "/campus"
  return "/discover"
}

export function roleLabelFor(role: UserRole | "admin", isAlumni?: boolean, staffRole?: string | null) {
  if (role === "admin") return "Admin"
  if (role === "university") return staffRole || "Career office"
  if (role === "recruiter") return "Recruiter"
  return isAlumni ? "Alumni" : "Student"
}
