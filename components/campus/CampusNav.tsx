"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { NavGroupMenu, isNavPathActive } from "@/components/nav/NavGroupMenu"
import { campusNavGroups } from "@/lib/campus/nav"
import { cn } from "@/lib/utils"

export function CampusNav({ staffRole }: { staffRole?: string }) {
  const pathname = usePathname()
  const params = useSearchParams()
  const campus = params.get("campus")
  const q = campus ? `?campus=${encodeURIComponent(campus)}` : ""
  const groups = campusNavGroups(staffRole)

  return (
    <nav className="-mx-1 flex flex-wrap items-center gap-1" aria-label="Career office">
      {groups.map((group) =>
        group.items.length === 1 ? (
          <Link
            key={group.label}
            href={`${group.items[0].href}${q}`}
            className={cn(
              "inline-flex h-8 items-center rounded-full px-3 text-sm font-medium",
              isNavPathActive(pathname, group.items[0].href)
                ? "bg-secondary font-semibold text-primary"
                : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
            )}
            aria-current={isNavPathActive(pathname, group.items[0].href) ? "page" : undefined}
          >
            {group.items[0].label}
          </Link>
        ) : (
          <NavGroupMenu
            key={group.label}
            label={group.label}
            items={group.items}
            pathname={pathname}
            query={q}
            variant="bar"
          />
        )
      )}
    </nav>
  )
}
