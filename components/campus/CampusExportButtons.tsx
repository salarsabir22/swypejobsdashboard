import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { CampusExportDataset } from "@/lib/campus/export"
import { campusRangeQuery, type CampusRange } from "@/lib/campus/range"

const FORMATS = [
  { id: "csv", label: "CSV" },
  { id: "xls", label: "Excel" },
  { id: "pdf", label: "PDF" },
] as const

const LABELS: Record<CampusExportDataset, string> = {
  overview: "CDC dashboard overview",
  placement: "placement rate",
  active_students: "active students",
  open_jobs: "open jobs",
  applications: "student applications",
  employers: "employers engaged",
  attention: "students needing attention",
  equity: "equity gap flag",
  jobs: "daily job posts",
  engagement: "student engagement",
  departments: "at-risk departments",
  outcomes: "first-destination outcomes",
}

export function CampusExportButtons({
  dataset,
  campus,
  range,
  period,
  compact = false,
  stacked = false,
}: {
  dataset: CampusExportDataset
  campus?: string | null
  /** @deprecated Prefer `period` so custom from/to are included. */
  range?: string | null
  period?: Pick<CampusRange, "id" | "from" | "to"> | null
  compact?: boolean
  stacked?: boolean
}) {
  const query = new URLSearchParams({ dataset })
  if (campus) query.set("campus", campus)
  const rangeParams = period ? campusRangeQuery(period) : range && range !== "month" ? { range } : {}
  for (const [key, value] of Object.entries(rangeParams)) query.set(key, value)
  const topic = LABELS[dataset]

  return (
    <div
      className={cn("flex", stacked ? "flex-col items-stretch gap-1.5" : compact ? "flex-wrap gap-1.5" : "flex-wrap gap-2")}
      role="group"
      aria-label={`${topic} reports`}
    >
      {FORMATS.map((format) => (
        <Button
          key={format.id}
          asChild
          size="sm"
          variant="outline"
          className={cn(
            "rounded-full border-[rgba(5,28,44,0.14)] bg-white text-[#051C2C] shadow-none hover:bg-[rgba(34,81,255,0.06)] hover:text-[#2251FF]",
            compact ? "h-8 gap-1.5 px-3 text-[12px] font-medium [&_svg]:size-3.5" : "[&_svg]:size-4",
            stacked && "w-full justify-center"
          )}
        >
          <a
            href={`/api/campus/export?${query.toString()}&format=${format.id}`}
            download
            aria-label={`Download ${topic} ${format.label} report`}
          >
            <Download aria-hidden />
            {format.label}
          </a>
        </Button>
      ))}
    </div>
  )
}
