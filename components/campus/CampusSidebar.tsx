"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { ChevronDown } from "lucide-react"
import { campusNavForRole, campusPathActive, type CampusNavItem } from "@/lib/campus/nav"
import { cn } from "@/lib/utils"

function itemActive(pathname: string, search: string, item: CampusNavItem) {
  if (item.children?.length) {
    return item.children.some((child) => campusPathActive(pathname, child.href, search)) || campusPathActive(pathname, item.href, search)
  }
  return campusPathActive(pathname, item.href, search)
}

export function CampusSidebar({
  staffRole,
  collapsed = false,
  onNavigate,
}: {
  staffRole?: string | null
  collapsed?: boolean
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const params = useSearchParams()
  const campus = params.get("campus")
  const search = params.toString()
  const q = campus ? `?campus=${encodeURIComponent(campus)}` : ""
  const items = useMemo(() => campusNavForRole(staffRole), [staffRole])
  const [open, setOpen] = useState<Record<string, boolean>>({})

  return (
    <nav className="flex flex-col gap-0.5 p-2" aria-label="CDC">
      {items.map((item) => {
        const Icon = item.icon
        const active = itemActive(pathname, search, item)
        const expanded = open[item.href] ?? active
        const href = item.children?.length ? item.children[0].href : item.href
        const suffix = href.includes("?") ? (campus ? `&campus=${encodeURIComponent(campus)}` : "") : q

        return (
          <div key={item.href}>
            <div className="flex items-center gap-0.5">
              <Link
                href={`${href}${suffix}`}
                title={item.label}
                onClick={onNavigate}
                aria-current={active && !item.children?.length ? "page" : undefined}
                className={cn(
                  "flex min-h-11 flex-1 items-center gap-3 rounded-xl px-3 text-[14px] font-medium tracking-[-0.01em] transition-colors",
                  collapsed && "justify-center px-0",
                  active
                    ? "bg-secondary font-semibold text-primary"
                    : "text-foreground/80 hover:bg-secondary/70 hover:text-foreground"
                )}
              >
                {Icon ? <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} /> : null}
                {collapsed ? <span className="sr-only">{item.label}</span> : <span className="truncate">{item.label}</span>}
              </Link>
              {!collapsed && item.children?.length ? (
                <button
                  type="button"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
                  aria-expanded={expanded}
                  aria-label={`${expanded ? "Collapse" : "Expand"} ${item.label}`}
                  onClick={() => setOpen((prev) => ({ ...prev, [item.href]: !expanded }))}
                >
                  <ChevronDown className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")} />
                </button>
              ) : null}
            </div>
            {!collapsed && expanded && item.children?.length ? (
              <ul className="mb-1 ml-4 mt-0.5 space-y-0.5 border-l border-border pl-2">
                {item.children.map((child) => {
                  const childActive = campusPathActive(pathname, child.href, search)
                  const childSuffix = child.href.includes("?")
                    ? campus
                      ? `&campus=${encodeURIComponent(campus)}`
                      : ""
                    : q
                  return (
                    <li key={child.href}>
                      <Link
                        href={`${child.href}${childSuffix}`}
                        onClick={onNavigate}
                        aria-current={childActive ? "page" : undefined}
                        className={cn(
                          "flex min-h-11 items-center rounded-xl px-3 text-[13px] font-medium",
                          childActive
                            ? "bg-secondary font-semibold text-primary"
                            : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
                        )}
                      >
                        {child.label}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            ) : null}
          </div>
        )
      })}
    </nav>
  )
}
