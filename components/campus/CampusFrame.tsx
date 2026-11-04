import type { ReactNode } from "react"
import { CampusExportButtons } from "@/components/campus/CampusExportButtons"
import { CampusFilter } from "@/components/campus/CampusFilter"
import { SourceBadge } from "@/components/campus/SourceBadge"
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader"
import type { CampusExportDataset } from "@/lib/campus/export"
import { canCampus } from "@/lib/campus/rbac"
import type { CampusSnapshot } from "@/lib/campus/types"
import { formatIobmStaffRole } from "@/lib/sso/iobm"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function CampusFrame({
  snapshot,
  title,
  description,
  children,
  showSources = false,
  exportDataset,
}: {
  snapshot: CampusSnapshot
  title: string
  description: string
  children: ReactNode
  showSources?: boolean
  exportDataset?: CampusExportDataset
}) {
  const campusLabel = snapshot.access.university || "All campuses"
  const canExport = canCampus(snapshot.access, "export")

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <DashboardPageHeader
          eyebrow={`${campusLabel} · ${formatIobmStaffRole(snapshot.access.staffRole)}`}
          title={title}
          description={description}
        />
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
      {showSources || (canExport && exportDataset) ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {showSources ? (
            <div className="flex flex-wrap gap-2">
              <SourceBadge source="platform" />
              <SourceBadge source="survey" />
              <SourceBadge source="self_reported" />
            </div>
          ) : <span />}
          {canExport && exportDataset ? <CampusExportButtons dataset={exportDataset} campus={snapshot.access.university} /> : null}
        </div>
      ) : null}
      {children}
    </div>
  )
}
