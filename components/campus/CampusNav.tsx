"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { campusNavScope } from "@/lib/campus/staff-roles"
import { cn } from "@/lib/utils"

const PRIMARY = [
  { href: "/campus", label: "Home" },
  { href: "/campus/approvals", label: "Approvals" },
  { href: "/campus/collections", label: "Curated jobs" },
  { href: "/campus/employers", label: "Employers" },
  { href: "/campus/appointments", label: "Advising" },
]

const MORE = [
  { href: "/campus/announcements", label: "Announcements" },
  { href: "/campus/events", label: "Events" },
  { href: "/campus/opportunities", label: "International" },
  { href: "/campus/actions", label: "Actions" },
]

const REPORTS = [
  { href: "/campus/outcomes", label: "Outcomes" },
  { href: "/campus/engagement", label: "Engagement" },
  { href: "/campus/market", label: "Market" },
  { href: "/campus/quality", label: "Match quality" },
  { href: "/campus/equity", label: "Equity" },
  { href: "/campus/operations", label: "Operations" },
  { href: "/campus/reports", label: "Reports" },
  { href: "/campus/trends", label: "Trends" },
]

function isActivePath(pathname: string, href: string) {
  return href === "/campus" ? pathname === "/campus" : pathname.startsWith(href)
}

function pillClass(active: boolean) {
  return cn(
    "shrink-0 rounded-full px-3 py-1.5 text-sm font-medium",
    active ? "bg-secondary font-semibold text-primary" : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
  )
}

export function CampusNav({ staffRole }: { staffRole?: string }) {
  const pathname = usePathname()
  const params = useSearchParams()
  const campus = params.get("campus")
  const q = campus ? `?campus=${encodeURIComponent(campus)}` : ""
  const scope = campusNavScope(staffRole)
  const primary = scope === "faculty"
    ? PRIMARY.filter((link) => link.href === "/campus" || link.href === "/campus/appointments")
    : scope === "reports"
      ? PRIMARY.filter((link) => link.href === "/campus")
      : PRIMARY
  const more = scope === "faculty" ? MORE.filter((link) => link.href === "/campus/events") : scope === "reports" ? [] : MORE
  const reports = scope === "faculty" ? [] : REPORTS
  const moreActive = more.some((link) => isActivePath(pathname, link.href))
  const reportsActive = reports.some((link) => isActivePath(pathname, link.href))

  return (
    <nav className="-mx-1 flex flex-wrap items-center gap-1" aria-label="Career office">
      {primary.map((link) => (
        <Link
          key={link.href}
          href={`${link.href}${q}`}
          className={pillClass(isActivePath(pathname, link.href))}
          aria-current={isActivePath(pathname, link.href) ? "page" : undefined}
        >
          {link.label}
        </Link>
      ))}
      {more.length ? <NavMenu label="More" active={moreActive} items={more} query={q} pathname={pathname} /> : null}
      {reports.length ? <NavMenu label="Reports" active={reportsActive} items={reports} query={q} pathname={pathname} /> : null}
    </nav>
  )
}

function NavMenu({
  label,
  active,
  items,
  query,
  pathname,
}: {
  label: string
  active: boolean
  items: { href: string; label: string }[]
  query: string
  pathname: string
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" className={cn("h-auto gap-1", pillClass(active))}>
          {label}
          <ChevronDown className="h-3.5 w-3.5 opacity-70" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.map((link) => (
          <DropdownMenuItem key={link.href} asChild>
            <Link href={`${link.href}${query}`} aria-current={isActivePath(pathname, link.href) ? "page" : undefined}>
              {link.label}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
