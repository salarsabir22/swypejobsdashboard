import { AppNav } from "@/components/nav/AppNav"
import { AppMain } from "@/components/nav/AppMain"
import { AppChrome } from "@/components/nav/AppChrome"
import type { AppShellUser } from "@/lib/nav/app-shell-user"

export function AppShell({ user, children }: { user: AppShellUser; children: React.ReactNode }) {
  if (user.userId) {
    return <AppChrome user={user}>{children}</AppChrome>
  }

  return (
    <div className="min-h-screen overflow-x-hidden apple-grouped-bg text-foreground selection:bg-primary/20">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <AppNav />
      <main id="main-content" className="min-w-0 pt-16">
        <AppMain>{children}</AppMain>
      </main>
    </div>
  )
}
