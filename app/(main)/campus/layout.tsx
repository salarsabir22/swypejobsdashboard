import { Suspense } from "react"

export default function CampusLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<p className="text-sm text-muted-foreground">Loading campus…</p>}>{children}</Suspense>
}
