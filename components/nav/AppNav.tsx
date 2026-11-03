"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { FileText, LogOut, Menu, MessageSquareText, LayoutDashboard, Share2, Users, UserRound } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { Logo } from "@/components/brand/Logo"
import type { UserRole } from "@/types"
import { NotificationBell } from "@/components/nav/NotificationBell"
import { ShareProfileMenuItem } from "@/components/share/ShareButton"
import { shareOrCopyLink } from "@/lib/share/share-link"
import { useToast } from "@/lib/hooks/use-toast"
import { alumniNavGroups, recruiterNavGroups, studentNavGroups } from "@/components/nav/app-nav-config"
import { NavGroupMenu, isNavPathActive } from "@/components/nav/NavGroupMenu"
import { useChatUnread } from "@/lib/hooks/use-chat-unread"
import { profileSharePath } from "@/lib/share/profile-path"
import { campusNavGroups } from "@/lib/campus/nav"
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
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { AdminNavDropdowns, AdminNavMobileLinks } from "@/components/admin/AdminNav"

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
  adminModules?: string[]
  isAlumni?: boolean
  staffRole?: string | null
}

export function AppNav({
  role,
  userId,
  fullName,
  email,
  avatarUrl,
  shareTitle,
  adminModules,
  isAlumni,
  staffRole,
}: AppNavProps) {
  const pathname = usePathname()
  const { toast } = useToast()
  const chatUnread = useChatUnread()
  const [menuOpen, setMenuOpen] = useState(false)
  const signedIn = Boolean(userId)
  const sharePath = userId && role !== "admin" && role !== "university" ? profileSharePath(role, userId) : null
  const resolvedShareTitle = shareTitle || fullName || (role === "recruiter" ? "Company profile" : "Profile")
  const groups = (
    role === "recruiter"
      ? recruiterNavGroups
      : role === "university"
        ? campusNavGroups(staffRole)
        : isAlumni
          ? alumniNavGroups
          : studentNavGroups
  ).map((group) =>
    role === "university" && group.label === "Work"
      ? { ...group, items: group.items.filter((item) => item.href !== "/campus") }
      : group
  ).filter((group) => group.items.length)
  const homeHref = !signedIn ? "/" : role === "admin" ? "/admin" : role === "university" ? "/campus" : "/discover"
  const modules = adminModules?.length ? adminModules : ["all"]
  const homeActive = isNavPathActive(pathname, homeHref)

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = "/login"
  }

  const displayName = fullName ?? email?.split("@")[0] ?? "User"
  const initials = displayName.charAt(0).toUpperCase()
  const roleLabel =
    role === "admin"
      ? "Admin"
      : role === "university"
        ? "Career office"
        : role === "recruiter"
          ? "Recruiter"
          : isAlumni
            ? "Alumni"
            : "Student"

  const closeMenu = () => setMenuOpen(false)

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-16 border-b border-border/80 bg-background/75 backdrop-blur-2xl backdrop-saturate-150">
      <div className="mx-auto grid h-full w-full max-w-[1728px] grid-cols-[1fr_auto_1fr] items-center px-4 sm:px-6 lg:px-10 xl:px-14">
        <div className="flex min-w-0 items-center justify-self-start gap-0.5">
          {signedIn ? (
            <Drawer direction="left" handleOnly open={menuOpen} onOpenChange={setMenuOpen}>
              <DrawerTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 min-h-11 min-w-11 rounded-full text-foreground"
                  aria-label="Open menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </DrawerTrigger>
              <DrawerContent className="flex h-full max-h-dvh flex-col">
                <DrawerHeader className="border-b border-border">
                  <DrawerTitle>
                    <Logo size={26} />
                  </DrawerTitle>
                  <DrawerDescription>
                    {displayName} · {roleLabel}
                  </DrawerDescription>
                </DrawerHeader>
                <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3" aria-label="App menu">
                  {role === "admin" ? (
                    <>
                      <AdminNavMobileLinks modules={modules} onNavigate={closeMenu} />
                    </>
                  ) : (
                    <>
                      <DrawerClose asChild>
                        <Link
                          href={homeHref}
                          aria-current={homeActive ? "page" : undefined}
                          className={cn(
                            "flex min-h-11 items-center rounded-xl px-3 text-[15px] font-medium tracking-[-0.01em] transition-colors",
                            homeActive
                              ? "bg-secondary font-semibold text-primary"
                              : "text-foreground/80 hover:bg-secondary/70 hover:text-foreground"
                          )}
                        >
                          {role === "university" ? "Home" : "Discover"}
                        </Link>
                      </DrawerClose>
                      {groups.map((group) => (
                        <NavGroupMenu
                          key={group.label}
                          label={group.label}
                          items={group.items}
                          pathname={pathname}
                          variant="drawer"
                          chatUnread={chatUnread}
                          onNavigate={closeMenu}
                        />
                      ))}
                    </>
                  )}
                  {sharePath ? (
                    <button
                      type="button"
                      className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-left text-[15px] font-medium tracking-[-0.01em] text-foreground/80 transition-colors hover:bg-secondary/70 hover:text-foreground"
                      onClick={() => {
                        closeMenu()
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
                  ) : null}
                </nav>
                <DrawerFooter className="border-t border-border">
                  <Button variant="ghost" className="min-h-11 w-full justify-start rounded-xl" onClick={handleSignOut}>
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </Button>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          ) : null}

          <Link
            href={homeHref}
            className="hidden rounded-md px-1.5 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 sm:inline-flex"
          >
            <BrandMark />
          </Link>
        </div>

        <div className="flex items-center justify-center px-2">
          <Link
            href={homeHref}
            className="rounded-md px-1.5 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 sm:hidden"
          >
            <BrandMark />
          </Link>
          {signedIn ? (
            <nav className="hidden items-center justify-center gap-0.5 md:flex" aria-label="Primary">
              {role === "admin" ? (
                <>
                  <AdminNavDropdowns modules={modules} />
                  <Link
                    href="/campus"
                    aria-current={isNavPathActive(pathname, "/campus") ? "page" : undefined}
                    className={navItemClass(isNavPathActive(pathname, "/campus"))}
                  >
                    Campus
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href={homeHref}
                    aria-current={homeActive ? "page" : undefined}
                    className={cn(navItemClass(homeActive), "relative")}
                  >
                    {role === "university" ? "Home" : "Discover"}
                  </Link>
                  {groups.map((group) => (
                    <NavGroupMenu
                      key={group.label}
                      label={group.label}
                      items={group.items}
                      pathname={pathname}
                      variant="bar"
                      chatUnread={chatUnread}
                    />
                  ))}
                </>
              )}
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
                    className="h-11 w-11 min-h-11 min-w-11 rounded-full p-0 hover:bg-foreground/[0.05]"
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
                  {role !== "admin" && role !== "university" ? (
                    <>
                      <DropdownMenuItem asChild>
                        <Link href="/profile">
                          <UserRound />
                          Profile
                        </Link>
                      </DropdownMenuItem>
                      {role === "student" ? (
                        <DropdownMenuItem asChild>
                          <Link href="/resume">
                            <FileText />
                            Resume
                          </Link>
                        </DropdownMenuItem>
                      ) : null}
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
