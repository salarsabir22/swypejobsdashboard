import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { CampusExportDataset } from "@/lib/campus/export"

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
  compact = false,
}: {
  dataset: CampusExportDataset
  campus?: string | null
  compact?: boolean
}) {
  const query = new URLSearchParams({ dataset })
  if (campus) query.set("campus", campus)
  const topic = LABELS[dataset]

  return (
    <div className={cn("flex flex-wrap", compact ? "gap-1.5" : "gap-2")} role="group" aria-label={`${topic} reports`}>
      {FORMATS.map((format) => (
        <Button
          key={format.id}
          asChild
          size="sm"
          variant="outline"
          className={cn(
            "rounded-full border-[#c5bfff] bg-white text-[#5a48ff] shadow-none hover:bg-[#f4f2ff] hover:text-[#5a48ff]",
            compact ? "h-8 gap-1.5 px-3 text-[12px] font-medium [&_svg]:size-3.5" : "[&_svg]:size-4"
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
