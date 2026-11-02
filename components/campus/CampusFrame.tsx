import type { ReactNode } from "react"
import { CampusFilter } from "@/components/campus/CampusFilter"
import { CampusNav } from "@/components/campus/CampusNav"
import { SourceBadge } from "@/components/campus/SourceBadge"
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader"
import type { CampusSnapshot } from "@/lib/campus/types"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function CampusFrame({
  snapshot,
  title,
  description,
  children,
  showSources = false,
}: {
  snapshot: CampusSnapshot
  title: string
  description: string
  children: ReactNode
  showSources?: boolean
}) {
  const campusLabel = snapshot.access.university || "All campuses"

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <DashboardPageHeader
          eyebrow={`${campusLabel} · ${snapshot.access.staffRole}`}
          title={title}
          description={description}
        />
        <CampusNav />
        {snapshot.access.role === "admin" ? <CampusFilter current={snapshot.access.university} /> : null}
      </header>
      {snapshot.missingTables.length ? (
        <Alert>
          <AlertDescription>
            Some career-office numbers aren’t live yet. Swipe and hiring stats on this page still come from the live
            platform.
          </AlertDescription>
        </Alert>
      ) : null}
      {showSources ? (
        <div className="flex flex-wrap gap-2">
          <SourceBadge source="platform" />
          <SourceBadge source="survey" />
          <SourceBadge source="self_reported" />
        </div>
      ) : null}
      {children}
    </div>
  )
}
