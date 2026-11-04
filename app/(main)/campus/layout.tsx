import { Suspense } from "react"

export default function CampusLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="campus-brand">
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading campus…</p>}>{children}</Suspense>
    </div>
  )
}
