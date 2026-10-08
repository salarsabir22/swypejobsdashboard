"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { UserRole } from "@/types"
import { recruiterTabs, studentTabs } from "@/components/nav/app-nav-config"
import { useChatUnread } from "@/lib/hooks/use-chat-unread"
import { NavUnreadBadge } from "@/components/nav/NavUnreadBadge"

export function AppBottomNav({ role }: { role: UserRole | "admin" }) {
  const pathname = usePathname()
  const chatUnread = useChatUnread()
  if (role === "admin" || role === "university") return null

  const items = role === "recruiter" ? recruiterTabs : studentTabs

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/75 pb-[env(safe-area-inset-bottom,0px)] backdrop-blur-2xl backdrop-saturate-150 lg:hidden"
      aria-label="Primary"
    >
      <div className="mx-auto flex h-[var(--app-tabbar-height)] w-full max-w-[1728px] items-stretch px-1">
        {items.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`)
          return (
            <Button
              key={href}
              asChild
              variant="ghost"
              className={cn(
                "h-auto min-w-0 flex-1 flex-col gap-0.5 rounded-md px-0 py-1 text-[10px] font-medium leading-none tracking-tight shadow-none",
                "[&_svg]:size-5",
                active ? "text-primary hover:bg-accent hover:text-primary" : "text-muted-foreground"
              )}
            >
              <Link href={href} aria-current={active ? "page" : undefined} className="relative flex flex-col items-center gap-0.5">
                <span className="relative">
                  <Icon strokeWidth={active ? 2.15 : 1.7} />
                  {href === "/chat" ? <NavUnreadBadge count={chatUnread} /> : null}
                </span>
                <span className="max-w-full truncate">{label}</span>
              </Link>
            </Button>
          )
        })}
      </div>
    </nav>
  )
}
