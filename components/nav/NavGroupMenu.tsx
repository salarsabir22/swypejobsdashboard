"use client"

import Link from "next/link"
import { ChevronDown, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { NavUnreadBadge } from "@/components/nav/NavUnreadBadge"
import { cn } from "@/lib/utils"

export type NavGroupItem = { href: string; label: string; icon?: LucideIcon }

export function isNavPathActive(pathname: string, href: string) {
  const path = href.split("#")[0]
  if (href.includes("#")) return false
  if (path === "/campus") return pathname === "/campus"
  if (path === "/admin") return pathname === "/admin"
  if (path === "/company") return pathname === "/company"
  return pathname === path || pathname.startsWith(`${path}/`)
}

export function NavGroupMenu({
  label,
  items,
  pathname,
  query = "",
  variant = "bar",
  chatUnread = 0,
  onNavigate,
}: {
  label: string
  items: NavGroupItem[]
  pathname: string
  query?: string
  variant?: "bar" | "drawer"
  chatUnread?: number
  onNavigate?: () => void
}) {
  const active = items.some((item) => isNavPathActive(pathname, item.href))
  const unread = items.some((item) => item.href === "/chat") ? chatUnread : 0

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className={cn(
            "relative gap-1",
            variant === "drawer"
              ? "h-11 w-full min-h-11 justify-between rounded-xl px-3 text-[15px] font-medium"
              : "h-8 rounded-full px-3 text-[13px] font-medium",
            active
              ? "bg-secondary font-semibold text-primary"
              : variant === "drawer"
                ? "text-foreground/80 hover:bg-secondary/70 hover:text-foreground"
                : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
          )}
        >
          <span className="truncate">{label}</span>
          {unread ? (
            <NavUnreadBadge
              count={unread}
              className="absolute right-8 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-white"
            />
          ) : null}
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side={variant === "drawer" ? "bottom" : "bottom"}
        className={cn(
          "z-[80] rounded-xl p-1.5",
          variant === "drawer" ? "w-[var(--radix-dropdown-menu-trigger-width)] min-w-56" : "min-w-48"
        )}
      >
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.map((item) => {
          const href = `${item.href}${item.href.includes("#") ? "" : query}`
          const itemActive = isNavPathActive(pathname, item.href)
          const Icon = item.icon
          return (
            <DropdownMenuItem key={item.href} asChild className="rounded-lg">
              <Link
                href={href}
                aria-current={itemActive ? "page" : undefined}
                className={cn("flex items-center gap-2", itemActive && "bg-secondary font-semibold")}
                onClick={onNavigate}
              >
                {Icon ? <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} /> : null}
                <span className="flex-1">{item.label}</span>
                {item.href === "/chat" ? <NavUnreadBadge count={chatUnread} /> : null}
              </Link>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
