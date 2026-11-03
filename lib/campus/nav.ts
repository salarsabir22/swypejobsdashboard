import { campusNavScope } from "@/lib/campus/staff-roles"

export type CampusNavLink = { href: string; label: string }

export const CAMPUS_WORK: CampusNavLink[] = [
  { href: "/campus", label: "Home" },
  { href: "/campus/approvals", label: "Approvals" },
  { href: "/campus/collections", label: "Curated jobs" },
  { href: "/campus/employers", label: "Employers" },
  { href: "/campus/appointments", label: "Advising" },
]

export const CAMPUS_MORE: CampusNavLink[] = [
  { href: "/campus/announcements", label: "Announcements" },
  { href: "/campus/events", label: "Events" },
  { href: "/campus/opportunities", label: "International" },
  { href: "/campus/actions", label: "Actions" },
  { href: "/campus/sso", label: "SSO" },
]

export const CAMPUS_REPORTS: CampusNavLink[] = [
  { href: "/campus/outcomes", label: "Outcomes" },
  { href: "/campus/engagement", label: "Engagement" },
  { href: "/campus/applications", label: "Applications" },
  { href: "/campus/market", label: "Market" },
  { href: "/campus/quality", label: "Match quality" },
  { href: "/campus/equity", label: "Equity" },
  { href: "/campus/operations", label: "Operations" },
  { href: "/campus/reports", label: "Reports" },
  { href: "/campus/trends", label: "Trends" },
]

export type CampusNavGroup = { label: string; items: CampusNavLink[] }

export function campusNavGroups(staffRole?: string | null): CampusNavGroup[] {
  const scope = campusNavScope(staffRole)
  const work =
    scope === "faculty"
      ? CAMPUS_WORK.filter((link) => link.href === "/campus" || link.href === "/campus/appointments")
      : scope === "reports"
        ? CAMPUS_WORK.filter((link) => link.href === "/campus")
        : CAMPUS_WORK
  const more =
    scope === "faculty"
      ? CAMPUS_MORE.filter((link) => link.href === "/campus/events")
      : scope === "reports"
        ? []
        : scope === "department"
          ? CAMPUS_MORE.filter((link) => link.href !== "/campus/sso")
          : CAMPUS_MORE
  const reports = scope === "faculty" ? [] : CAMPUS_REPORTS
  return [
    { label: "Work", items: work },
    { label: "Campus", items: more },
    { label: "Reports", items: reports },
  ].filter((group) => group.items.length)
}
