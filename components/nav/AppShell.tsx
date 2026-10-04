import { AppNav } from "@/components/nav/AppNav"
import { AppBottomNav } from "@/components/nav/AppBottomNav"
import { AppFooter } from "@/components/nav/AppFooter"
import { AppMain } from "@/components/nav/AppMain"
import { cn } from "@/lib/utils"
import type { AppShellUser } from "@/lib/nav/app-shell-user"

export function AppShell({ user, children }: { user: AppShellUser; children: React.ReactNode }) {
  const signedIn = Boolean(user.userId)

  return (
    <div className="min-h-screen overflow-x-hidden apple-grouped-bg text-foreground selection:bg-primary/20">
      <AppNav
        role={user.role}
        userId={user.userId}
        fullName={user.fullName}
        email={user.email}
        avatarUrl={user.avatarUrl}
        shareTitle={user.shareTitle}
      />

      <main className={cn("min-w-0 pt-16", signedIn && user.role !== "admin" && "lg:pb-0")}>
        <AppMain>{children}</AppMain>
        {signedIn ? <AppFooter role={user.role} /> : null}
      </main>
      {signedIn ? <AppBottomNav role={user.role} /> : null}
    </div>
  )
}
