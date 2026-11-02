import { AppShell } from "@/components/nav/AppShell"
import { loadAppShellUser } from "@/lib/nav/app-shell-user"

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const user = await loadAppShellUser(true)
  return <AppShell user={user}>{children}</AppShell>
}
