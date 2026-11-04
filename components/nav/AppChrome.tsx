"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { FileText, LayoutDashboard, LogOut, Menu, MessageSquareText, PanelLeft, UserRound, Users } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { IobmMark } from "@/components/brand/IobmMark"
import { Logo } from "@/components/brand/Logo"
import { CoBrand } from "@/components/sso/CoBrand"
import { CampusSearch } from "@/components/campus/CampusSearch"
import { AppSidebar } from "@/components/nav/AppSidebar"
import { AppBottomNav } from "@/components/nav/AppBottomNav"
import { AppFooter } from "@/components/nav/AppFooter"
import { AppMain } from "@/components/nav/AppMain"
import { NotificationBell } from "@/components/nav/NotificationBell"
import { ShareProfileMenuItem } from "@/components/share/ShareButton"
import { homeHrefFor, roleLabelFor, sidebarSectionsFor } from "@/components/nav/sidebar-sections"
import { profileSharePath } from "@/lib/share/profile-path"
import { campusStaffCanSearch } from "@/lib/campus/staff-roles"
import { formatIobmStaffRole, IOBM_UNIVERSITY_NAME } from "@/lib/sso/iobm"
import type { AppShellUser } from "@/lib/nav/app-shell-user"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const STORAGE_KEY = "app-sidebar-collapsed"
const LEGACY_KEY = "cdc-sidebar-collapsed"

export function AppChrome({ user, children }: { user: AppShellUser; children: React.ReactNode }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const displayName = user.fullName ?? user.email?.split("@")[0] ?? "User"
  const initials = displayName.charAt(0).toUpperCase()
  const iobm = user.role === "university" || user.university === IOBM_UNIVERSITY_NAME
  const homeHref = homeHrefFor(user.role)
  const roleLabel = user.role === "university" ? formatIobmStaffRole(user.staffRole) : roleLabelFor(user.role, user.isAlumni)
  const sharePath = user.userId && user.role !== "admin" && user.role !== "university" ? profileSharePath(user.role, user.userId) : null
  const shareTitle = user.shareTitle || user.fullName || (user.role === "recruiter" ? "Company profile" : "Profile")
  const onCampus = pathname === "/campus" || pathname.startsWith("/campus/")
  const showSearch =
    (user.role === "university" && campusStaffCanSearch(user.staffRole)) ||
    (user.role === "admin" && onCampus)
  const sections = useMemo(
    () =>
      sidebarSectionsFor({
        role: user.role,
        isAlumni: user.isAlumni,
        staffRole: user.staffRole,
        adminModules: user.adminModules,
        pathname,
      }),
    [user.role, user.isAlumni, user.staffRole, user.adminModules, pathname]
  )

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_KEY)
      setCollapsed(stored === "1")
    } catch {
      /* ignore */
    }
  }, [])

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0")
      } catch {
        /* ignore */
      }
      return next
    })
  }

  const signOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = "/login"
  }

  const sidebarTitle =
    user.role === "university" ? "IoBM CDC" : iobm ? "IoBM" : user.role === "admin" ? "Admin" : "swypejobs"

  return (
    <div
      className={cn(
        "min-h-screen overflow-x-hidden apple-grouped-bg text-foreground selection:bg-primary/20 [--app-sidebar-width:0px]",
        collapsed ? "lg:[--app-sidebar-width:4.5rem]" : "lg:[--app-sidebar-width:16rem]"
      )}
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
      >
        Skip to content
      </a>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[var(--app-sidebar-width)] flex-col border-r border-border/80 bg-background/90 backdrop-blur-2xl lg:flex">
        <div className="flex h-16 items-center gap-2 border-b border-border/80 px-3">
          <Link href={homeHref} className={cn("flex min-w-0 items-center gap-2 rounded-md", collapsed && "mx-auto")}>
            {collapsed ? (
              iobm ? (
                <IobmMark size={32} />
              ) : (
                <span className="lp-logo-font text-[20px] font-bold leading-none text-foreground">
                  s<span className="text-primary">.</span>
                </span>
              )
            ) : iobm ? (
              <IobmMark size={32} />
            ) : (
              <Logo size={22} />
            )}
            <span className="sr-only">{sidebarTitle}</span>
            {collapsed ? null : (
              <div className="min-w-0">
                {iobm ? <p className="truncate text-sm font-semibold tracking-tight">{sidebarTitle}</p> : null}
                <p className="truncate text-[11px] text-muted-foreground">{roleLabel}</p>
              </div>
            )}
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto">
          <AppSidebar sections={sections} collapsed={collapsed} />
        </div>
        <div className="border-t border-border/80 p-2">
          <Button
            type="button"
            variant="ghost"
            className="h-11 min-h-11 w-full justify-center rounded-xl lg:justify-start"
            onClick={toggleCollapsed}
            aria-pressed={collapsed}
          >
            <PanelLeft className="h-4 w-4" />
            {collapsed ? <span className="sr-only">Expand sidebar</span> : <span>Collapse</span>}
          </Button>
        </div>
      </aside>

      <header className="fixed inset-x-0 top-0 z-50 h-16 border-b border-border/80 bg-background/75 backdrop-blur-2xl lg:left-[var(--app-sidebar-width)]">
        <div className="flex h-full items-center gap-2 px-3 sm:px-4">
          <Drawer direction="left" handleOnly open={menuOpen} onOpenChange={setMenuOpen}>
            <DrawerTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 min-h-11 min-w-11 rounded-full lg:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </DrawerTrigger>
            <DrawerContent className="flex h-full max-h-dvh flex-col">
              <DrawerHeader className="border-b border-border">
                <DrawerTitle className="flex items-center gap-2">
                  {iobm ? <IobmMark size={28} /> : <Logo size={22} />}
                  {sidebarTitle}
                </DrawerTitle>
                <DrawerDescription>
                  {displayName} · {roleLabel}
                </DrawerDescription>
              </DrawerHeader>
              <div className="flex-1 overflow-y-auto">
                <AppSidebar sections={sections} onNavigate={() => setMenuOpen(false)} />
              </div>
              <DrawerFooter className="border-t border-border">
                <Button variant="ghost" className="min-h-11 w-full justify-start rounded-xl" onClick={() => void signOut()}>
                  <LogOut className="h-4 w-4" />
                  Sign out
                </Button>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>

          <Link href={homeHref} className="flex min-w-0 items-center rounded-md px-1">
            {iobm ? (
              <>
                <IobmMark size={28} className="sm:hidden" />
                <CoBrand size={28} className="hidden gap-2 sm:flex" />
              </>
            ) : (
              <Logo size={26} />
            )}
          </Link>

          <div className="flex min-w-0 flex-1 justify-center px-2">
            {showSearch ? <CampusSearch /> : null}
          </div>

          <NotificationBell />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 min-h-11 min-w-11 rounded-full p-0"
                aria-label="Account menu"
              >
                <Avatar className="h-8 w-8 ring-1 ring-border">
                  <AvatarImage src={user.avatarUrl ?? undefined} alt="" />
                  <AvatarFallback className="bg-primary/10 text-[11px] font-semibold text-primary">{initials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl p-1.5">
              <DropdownMenuLabel className="font-normal">
                <p className="truncate text-sm font-medium">{displayName}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground">{user.email ?? roleLabel}</p>
                <p className="mt-1.5 text-[11px] font-medium text-muted-foreground">{roleLabel}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {user.role !== "admin" && user.role !== "university" ? (
                <>
                  <DropdownMenuItem asChild>
                    <Link href="/profile">
                      <UserRound />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  {user.role === "student" ? (
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
                  {sharePath ? <ShareProfileMenuItem path={sharePath} title={shareTitle} /> : null}
                  <DropdownMenuItem asChild>
                    <Link href="/feedback">
                      <MessageSquareText />
                      Feedback
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              ) : (
                <DropdownMenuItem asChild>
                  <Link href={user.role === "university" ? "/campus/settings" : "/admin"}>
                    Settings
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onSelect={() => void signOut()}>
                <LogOut />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main id="main-content" className="min-w-0 pt-16 lg:pl-[var(--app-sidebar-width)]">
        <AppMain>{children}</AppMain>
        {user.role !== "university" ? <AppFooter role={user.role} /> : null}
      </main>
      <AppBottomNav role={user.role} />
    </div>
  )
}
