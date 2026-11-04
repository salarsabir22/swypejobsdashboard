"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { ChevronDown } from "lucide-react"
import { campusPathActive } from "@/lib/campus/nav"
import { isNavPathActive } from "@/components/nav/NavGroupMenu"
import { NavUnreadBadge } from "@/components/nav/NavUnreadBadge"
import { useChatUnread } from "@/lib/hooks/use-chat-unread"
import type { SidebarItem, SidebarSection } from "@/components/nav/sidebar-sections"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

function withCampus(href: string, campus: string | null) {
  if (!campus || !href.startsWith("/campus") || href.includes("campus=")) return href
  return `${href}${href.includes("?") ? "&" : "?"}campus=${encodeURIComponent(campus)}`
}

function linkActive(pathname: string, href: string, search: string, exact?: boolean) {
  if (href.startsWith("/campus")) return campusPathActive(pathname, href, search)
  if (exact) return pathname === href.split("#")[0].split("?")[0]
  return isNavPathActive(pathname, href)
}

function itemActive(pathname: string, search: string, item: SidebarItem) {
  if (item.children?.length) {
    return item.children.some((child) => linkActive(pathname, child.href, search, child.exact)) || linkActive(pathname, item.href, search, item.exact)
  }
  return linkActive(pathname, item.href, search, item.exact)
}

function NavLink({
  item,
  href,
  active,
  collapsed,
  chatUnread,
  onNavigate,
}: {
  item: SidebarItem
  href: string
  active: boolean
  collapsed: boolean
  chatUnread: number
  onNavigate?: () => void
}) {
  const Icon = item.icon
  const link = (
    <Link
      href={href}
      title={item.label}
      onClick={onNavigate}
      aria-current={active && !item.children?.length ? "page" : undefined}
      className={cn(
        "relative flex min-h-11 flex-1 items-center gap-3 rounded-xl px-3 text-[14px] font-medium tracking-[-0.01em] transition-colors",
        collapsed && "justify-center px-0",
        active
          ? "bg-secondary font-semibold text-primary"
          : "text-foreground/80 hover:bg-secondary/70 hover:text-foreground"
      )}
    >
      {Icon ? (
        <span className="relative shrink-0">
          <Icon className="h-4 w-4" strokeWidth={1.75} />
          {item.href === "/chat" ? <NavUnreadBadge count={chatUnread} /> : null}
        </span>
      ) : null}
      {collapsed ? (
        <span className="sr-only">{item.label}</span>
      ) : (
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <span className="truncate">{item.label}</span>
          {item.href === "/chat" && !Icon ? <NavUnreadBadge count={chatUnread} /> : null}
        </span>
      )}
    </Link>
  )

  if (!collapsed) return link

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  )
}

export function AppSidebar(props: {
  sections: SidebarSection[]
  collapsed?: boolean
  onNavigate?: () => void
}) {
  return (
    <Suspense fallback={<nav className="p-2" aria-label="Sidebar" />}>
      <AppSidebarNav {...props} />
    </Suspense>
  )
}

function AppSidebarNav({
  sections,
  collapsed = false,
  onNavigate,
}: {
  sections: SidebarSection[]
  collapsed?: boolean
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const params = useSearchParams()
  const campus = params.get("campus")
  const search = params.toString()
  const chatUnread = useChatUnread()
  const [open, setOpen] = useState<Record<string, boolean>>({})

  return (
    <nav className="flex flex-col gap-3 p-2" aria-label="Sidebar">
      {sections.map((section, index) => (
        <div key={`${section.label || "section"}-${index}`} className="flex flex-col gap-0.5">
          {section.label && !collapsed ? (
            <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {section.label}
            </p>
          ) : null}
          {collapsed && index > 0 ? <div className="mx-2 my-1 h-px bg-border/80" aria-hidden /> : null}
          {section.items.map((item) => {
            const active = itemActive(pathname, search, item)
            const expanded = open[item.href] ?? active
            const href = withCampus(item.children?.length ? item.children[0].href : item.href, campus)

            return (
              <div key={item.href}>
                <div className="flex items-center gap-0.5">
                  <NavLink
                    item={item}
                    href={href}
                    active={active}
                    collapsed={collapsed}
                    chatUnread={chatUnread}
                    onNavigate={onNavigate}
                  />
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
                      const childActive = linkActive(pathname, child.href, search, child.exact)
                      return (
                        <li key={child.href}>
                          <Link
                            href={withCampus(child.href, campus)}
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
        </div>
      ))}
    </nav>
  )
}
