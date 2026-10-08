"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { cn } from "@/lib/utils"

const LINKS = [
  { href: "/campus", label: "Home" },
  { href: "/campus/outcomes", label: "Outcomes" },
  { href: "/campus/engagement", label: "Engagement" },
  { href: "/campus/market", label: "Market" },
  { href: "/campus/quality", label: "Match quality" },
  { href: "/campus/equity", label: "Equity" },
  { href: "/campus/operations", label: "Operations" },
  { href: "/campus/reports", label: "Reports" },
  { href: "/campus/actions", label: "Actions" },
  { href: "/campus/trends", label: "Trends" },
]

export function CampusNav() {
  const pathname = usePathname()
  const params = useSearchParams()
  const campus = params.get("campus")
  const q = campus ? `?campus=${encodeURIComponent(campus)}` : ""

  return (
    <nav className="-mx-1 flex gap-1 overflow-x-auto pb-1" aria-label="Career office">
      {LINKS.map((link) => {
        const active = link.href === "/campus" ? pathname === "/campus" : pathname.startsWith(link.href)
        return (
          <Link
            key={link.href}
            href={`${link.href}${q}`}
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
