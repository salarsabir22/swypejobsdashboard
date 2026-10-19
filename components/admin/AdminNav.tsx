"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { canAccessModule, type AdminModule } from "@/lib/admin/modules"

const GROUPS: {
  label: string
  links: { href: string; label: string; module: AdminModule; exact?: boolean }[]
}[] = [
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

export function AdminNav({ modules = ["all"] }: { modules?: string[] }) {
  const pathname = usePathname()
  return (
    <nav className="space-y-3" aria-label="Admin sections">
      {GROUPS.map((group) => {
        const links = group.links.filter((link) => canAccessModule(modules, link.module))
        if (!links.length) return null
        return (
          <div key={group.label} className="space-y-1.5">
            <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{group.label}</p>
            <div className="-mx-1 flex gap-1 overflow-x-auto pb-1">
              {links.map((link) => {
                const active = link.exact ? pathname === link.href : pathname.startsWith(link.href)
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "shrink-0 rounded-full px-3 py-1.5 text-[13px] font-medium",
                      active
                        ? "bg-secondary font-semibold text-primary"
                        : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
                    )}
                  >
                    {link.label}
                  </Link>
                )
              })}
            </div>
          </div>
        )
      })}
    </nav>
  )
}
