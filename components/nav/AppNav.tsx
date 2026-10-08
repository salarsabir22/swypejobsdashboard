"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LogOut, Menu, MessageSquareText, LayoutDashboard, Share2, Users, UserRound } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { Logo } from "@/components/brand/Logo"
import type { UserRole } from "@/types"
import { NotificationBell } from "@/components/nav/NotificationBell"
import { ShareProfileMenuItem } from "@/components/share/ShareButton"
import { shareOrCopyLink } from "@/lib/share/share-link"
import { useToast } from "@/lib/hooks/use-toast"
import { recruiterMoreLinks, studentMoreLinks } from "@/components/nav/app-nav-config"
import { useChatUnread } from "@/lib/hooks/use-chat-unread"
import { NavUnreadBadge } from "@/components/nav/NavUnreadBadge"
import { profileSharePath } from "@/lib/share/profile-path"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

type NavLink = { href: string; label: string }

const studentLinks: NavLink[] = [
  { href: "/discover", label: "Discover" },
  { href: "/feed", label: "Feed" },
  { href: "/matches", label: "Applications" },
  { href: "/chat", label: "Messages" },
  { href: "/dashboard", label: "Insights" },
  { href: "/community", label: "Community" },
]

const recruiterLinks: NavLink[] = [
  { href: "/discover", label: "Discover" },
  { href: "/feed", label: "Feed" },
  { href: "/jobs", label: "Jobs" },
  { href: "/matches", label: "Pipeline" },
  { href: "/chat", label: "Messages" },
  { href: "/dashboard", label: "Insights" },
  { href: "/community", label: "Community" },
]

const adminLinks: NavLink[] = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/recruiters", label: "Recruiters" },
  { href: "/admin/channels", label: "Channels" },
  { href: "/admin/reports", label: "Reports" },
]

function BrandMark({ className }: { className?: string }) {
  return <Logo size={26} className={className} />
}

function navItemClass(active: boolean) {
  return cn(
    "inline-flex h-8 items-center justify-center rounded-full px-3 text-[13px] font-medium tracking-[-0.01em] transition-colors duration-150",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
    active
      ? "bg-secondary font-semibold text-primary"
      : "text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
  )
}

interface AppNavProps {
  role: UserRole | "admin"
  userId?: string | null
  fullName?: string | null
  email?: string | null
  avatarUrl?: string | null
  shareTitle?: string | null
}

export function AppNav({ role, userId, fullName, email, avatarUrl, shareTitle }: AppNavProps) {
  const pathname = usePathname()
  const { toast } = useToast()
  const chatUnread = useChatUnread()
  const [mobileOpen, setMobileOpen] = useState(false)
  const signedIn = Boolean(userId)
  const sharePath = userId && role !== "admin" ? profileSharePath(role, userId) : null
  const resolvedShareTitle = shareTitle || fullName || (role === "recruiter" ? "Company profile" : "Profile")
  const links = !signedIn
    ? []
    : role === "student"
      ? studentLinks
      : role === "recruiter"
        ? recruiterLinks
        : adminLinks
  const moreLinks = role === "recruiter" ? recruiterMoreLinks : studentMoreLinks
  const homeHref = !signedIn ? "/" : role === "admin" ? "/admin" : "/discover"

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = "/login"
  }

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin"
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  const displayName = fullName ?? email?.split("@")[0] ?? "User"
  const initials = displayName.charAt(0).toUpperCase()
  const roleLabel = role === "admin" ? "Admin" : role === "recruiter" ? "Recruiter" : "Student"

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-16 border-b border-border/80 bg-background/75 backdrop-blur-2xl backdrop-saturate-150">
      <div className="mx-auto grid h-full w-full max-w-[1728px] grid-cols-[1fr_auto_1fr] items-center px-4 sm:px-6 lg:px-10 xl:px-14">
        <div className="flex min-w-0 items-center justify-self-start gap-0.5">
          {signedIn ? (
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full text-foreground lg:hidden"
                  aria-label="Open menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="flex w-[min(20rem,88vw)] flex-col overflow-y-auto p-0">
                <SheetHeader className="border-b border-border px-5 py-5 text-left">
                  <SheetTitle>
                    <Logo size={26} />
                  </SheetTitle>
                  <SheetDescription className="text-[13px] text-muted-foreground">
                    {displayName} · {roleLabel}
                  </SheetDescription>
                </SheetHeader>
                <nav className="grid gap-0.5 p-3" aria-label="More">
                  {role === "admin"
                    ? links.map((link) => (
                        <SheetClose asChild key={link.href}>
                          <Link
                            href={link.href}
                            aria-current={isActive(link.href) ? "page" : undefined}
                            className={cn(
                              "rounded-xl px-3 py-2.5 text-[15px] font-medium tracking-[-0.01em] transition-colors",
                              isActive(link.href)
                                ? "bg-secondary font-semibold text-primary"
                                : "text-foreground/80 hover:bg-secondary/70 hover:text-foreground"
                            )}
                          >
                            {link.label}
                          </Link>
                        </SheetClose>
                      ))
                    : moreLinks.map((link) => {
                        const hrefPath = link.href.split("#")[0]
                        const active = link.href.includes("#") ? false : isActive(hrefPath)
                        const Icon = link.icon
                        return (
                          <SheetClose asChild key={link.href}>
                            <Link
                              href={link.href}
                              aria-current={active ? "page" : undefined}
                              className={cn(
                                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium tracking-[-0.01em] transition-colors",
                                active
                                  ? "bg-secondary font-semibold text-primary"
                                  : "text-foreground/80 hover:bg-secondary/70 hover:text-foreground"
                              )}
                            >
                              <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                              {link.label}
                            </Link>
                          </SheetClose>
                        )
                      })}
                  {sharePath ? (
                    <SheetClose asChild>
                      <button
                        type="button"
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[15px] font-medium tracking-[-0.01em] text-foreground/80 transition-colors hover:bg-secondary/70 hover:text-foreground"
                        onClick={() => {
                          void shareOrCopyLink({ path: sharePath, title: resolvedShareTitle }).then((result) => {
                            if (result === "copied") {
                              toast({ title: "Link copied", description: "Anyone with the link can open this profile." })
                            } else if (result === "failed") {
                              toast({ variant: "destructive", title: "Could not copy link" })
                            }
                          })
                        }}
                      >
                        <Share2 className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                        Share profile
                      </button>
                    </SheetClose>
                  ) : null}
                </nav>
                <div className="mt-auto border-t border-border p-3">
                  <Button variant="ghost" className="w-full justify-start rounded-xl" onClick={handleSignOut}>
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          ) : null}

          <Link
            href={homeHref}
            className="hidden rounded-md px-1.5 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 lg:inline-flex"
          >
            <BrandMark />
          </Link>
        </div>

        <div className="flex items-center justify-center px-2">
          <Link
            href={homeHref}
            className="rounded-md px-1.5 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 lg:hidden"
          >
            <BrandMark />
          </Link>
          {signedIn ? (
            <nav className="hidden items-center justify-center gap-0.5 lg:flex" aria-label="Primary">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={isActive(link.href) ? "page" : undefined}
                  className={cn(navItemClass(isActive(link.href)), "relative")}
                >
                  {link.label}
                  {link.href === "/chat" ? <NavUnreadBadge count={chatUnread} className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-white" /> : null}
                </Link>
              ))}
            </nav>
          ) : null}
        </div>

        <div className="flex items-center justify-self-end gap-0.5">
          {signedIn ? (
            <>
              <NotificationBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full p-0 hover:bg-foreground/[0.05]"
                    aria-label="Account menu"
                  >
                    <Avatar className="h-8 w-8 ring-1 ring-border">
                      <AvatarImage src={avatarUrl ?? undefined} alt="" />
                      <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-xl p-1.5">
                  <DropdownMenuLabel className="font-normal">
                    <p className="truncate text-sm font-medium leading-none tracking-[-0.01em]">{displayName}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{email ?? roleLabel}</p>
                    <p className="mt-1.5 text-[11px] font-medium text-muted-foreground">{roleLabel}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {role !== "admin" ? (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/profile">
                          <UserRound />
                          Profile
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/dashboard">
                          <LayoutDashboard />
                          Insights
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/community">
                          <Users />
                          Community
                        </Link>
                      </DropdownMenuItem>
                      {sharePath ? <ShareProfileMenuItem path={sharePath} title={resolvedShareTitle} /> : null}
                      <DropdownMenuItem asChild>
                        <Link href="/feedback">
                          <MessageSquareText />
                          Feedback
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  ) : null}
                  <DropdownMenuItem onSelect={() => void handleSignOut()}>
                    <LogOut />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button asChild size="sm" className="rounded-full px-4">
              <Link href="/login">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
