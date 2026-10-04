import { AppShell } from "@/components/nav/AppShell"
import { loadAppShellUser } from "@/lib/nav/app-shell-user"

export default async function ShareLayout({ children }: { children: React.ReactNode }) {
  const user = await loadAppShellUser()
  return <AppShell user={user}>{children}</AppShell>
}
