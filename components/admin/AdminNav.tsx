"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { canAccessModule } from "@/lib/admin/modules"
import { ADMIN_NAV_GROUPS } from "@/lib/admin/nav-groups"
import { NavGroupMenu } from "@/components/nav/NavGroupMenu"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

function linkActive(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
}

function groupActive(pathname: string, links: { href: string; exact?: boolean }[]) {
  return links.some((link) => linkActive(pathname, link.href, link.exact))
}

/** Desktop: Queues / Growth / Platform dropdowns for the top AppNav. */
export function AdminNavDropdowns({ modules = ["all"] }: { modules?: string[] }) {
  const pathname = usePathname()

  return (
    <>
      {ADMIN_NAV_GROUPS.map((group) => {
        const links = group.links.filter((link) => canAccessModule(modules, link.module))
        if (!links.length) return null
        const active = groupActive(pathname, links)
        return (
          <DropdownMenu key={group.label} modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className={cn(
                  "h-8 gap-1 rounded-full px-3 text-[13px] font-medium",
                  active
                    ? "bg-secondary font-semibold text-primary"
                    : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground",
                )}
              >
                {group.label}
                <ChevronDown className="h-3.5 w-3.5 opacity-70" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="min-w-[11rem] rounded-xl p-1.5">
              {links.map((link) => (
                <DropdownMenuItem key={link.href} asChild className="rounded-lg">
                  <Link
                    href={link.href}
                    aria-current={linkActive(pathname, link.href, link.exact) ? "page" : undefined}
                    className={cn(linkActive(pathname, link.href, link.exact) && "bg-secondary font-semibold")}
                  >
                    {link.label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      })}
    </>
  )
}

/** Drawer: grouped dropdowns for every screen. */
export function AdminNavMobileLinks({
  modules = ["all"],
  onNavigate,
}: {
  modules?: string[]
  onNavigate?: () => void
}) {
  const pathname = usePathname()

  return (
    <div className="grid gap-1">
      {ADMIN_NAV_GROUPS.map((group) => {
        const links = group.links.filter((link) => canAccessModule(modules, link.module))
        if (!links.length) return null
        return (
          <NavGroupMenu
            key={group.label}
            label={group.label}
            items={links}
            pathname={pathname}
            variant="drawer"
            onNavigate={onNavigate}
          />
        )
      })}
      <Link
        href="/campus"
        onClick={onNavigate}
        className="flex min-h-11 items-center rounded-xl px-3 text-[15px] font-medium text-foreground/80 hover:bg-secondary/70"
      >
        Campus
      </Link>
    </div>
  )
}
