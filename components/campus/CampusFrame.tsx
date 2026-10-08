import { CampusFilter } from "@/components/campus/CampusFilter"
import { CampusNav } from "@/components/campus/CampusNav"
import { SourceBadge } from "@/components/campus/SourceBadge"
import type { CampusSnapshot } from "@/lib/campus/types"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function CampusFrame({
  snapshot,
  title,
  description,
  children,
}: {
  snapshot: CampusSnapshot
  title: string
  description: string
  children: React.ReactNode
}) {
  const campusLabel = snapshot.access.university || "All campuses"

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <p className="text-[14px] text-muted-foreground">
          {campusLabel} · {snapshot.access.staffRole}
        </p>
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-[2.4rem] sm:leading-[1.02]">{title}</h1>
        <p className="max-w-2xl text-[15px] leading-relaxed text-muted-foreground">{description}</p>
        <CampusNav />
        {snapshot.access.role === "admin" ? <CampusFilter current={snapshot.access.university} /> : null}
      </header>
      {snapshot.missingTables.length ? (
        <Alert>
          <AlertDescription>
            Some career-office tables are not live yet ({snapshot.missingTables.slice(0, 4).join(", ")}
            {snapshot.missingTables.length > 4 ? "…" : ""}). Run{" "}
            <code className="text-[12px]">20261009_campus_insights.sql</code> in Supabase. Swipe and hiring
            numbers below still come from the live platform.
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <SourceBadge source="platform" />
        <SourceBadge source="survey" />
        <SourceBadge source="self_reported" />
      </div>
      {children}
    </div>
  )
}
