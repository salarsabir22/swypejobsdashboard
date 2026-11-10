import type { ReactNode } from "react"
import { CampusExportButtons } from "@/components/campus/CampusExportButtons"
import { CampusFilter } from "@/components/campus/CampusFilter"
import { CampusRangeFilter } from "@/components/campus/CampusRangeFilter"
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
  showRange = true,
  hideEyebrow = false,
  actions,
}: {
  snapshot: CampusSnapshot
  title: string
  description: string
  children: ReactNode
  showSources?: boolean
  exportDataset?: CampusExportDataset
  /** Keep true for period-scoped reports; false for queues, directories, settings, curation. */
  showRange?: boolean
  hideEyebrow?: boolean
  actions?: ReactNode
}) {
  const campusLabel = snapshot.access.university || "All campuses"
  const canExport = canCampus(snapshot.access, "export")
  const period = snapshot.period
  const eyebrowParts = [
    campusLabel,
    formatIobmStaffRole(snapshot.access.staffRole),
    showRange ? period?.label || "1 month" : null,
  ].filter(Boolean)

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <DashboardPageHeader
          eyebrow={hideEyebrow ? undefined : eyebrowParts.join(" · ")}
          title={title}
          description={description}
          action={actions}
        />
        {snapshot.access.role === "admin" ? <CampusFilter current={snapshot.access.university} /> : null}
        {showRange ? (
          <CampusRangeFilter current={period?.id} from={period?.from} to={period?.to} />
        ) : null}
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
          {canExport && exportDataset ? (
            <CampusExportButtons dataset={exportDataset} campus={snapshot.access.university} period={period} />
          ) : null}
        </div>
      ) : null}
      {children}
    </div>
  )
}
