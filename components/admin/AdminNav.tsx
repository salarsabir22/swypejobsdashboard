"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const LINKS = [
  { href: "/admin", label: "Home" },
  { href: "/admin/employers", label: "Employers" },
  { href: "/admin/jobs", label: "Jobs" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/universities", label: "Universities" },
  { href: "/admin/safety", label: "Safety" },
  { href: "/admin/matching", label: "Matching" },
  { href: "/admin/comms", label: "Comms" },
  { href: "/admin/billing", label: "Billing" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/team", label: "Team" },
  { href: "/admin/compliance", label: "Compliance" },
  { href: "/admin/integrations", label: "Integrations" },
  { href: "/admin/alerts", label: "Alerts" },
]

export function AdminNav() {
  const pathname = usePathname()
  return (
    <nav className="-mx-1 flex gap-1 overflow-x-auto pb-1" aria-label="Super admin">
      {LINKS.map((link) => {
        const active = link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href)
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-[13px] font-medium",
              active ? "bg-secondary font-semibold text-primary" : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
            )}
          >
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}
