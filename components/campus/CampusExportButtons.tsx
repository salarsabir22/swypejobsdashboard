import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { CampusExportDataset } from "@/lib/campus/export"

const FORMATS = [
  { id: "csv", label: "CSV" },
  { id: "xls", label: "Excel" },
  { id: "pdf", label: "PDF" },
] as const

export function CampusExportButtons({
  dataset,
  campus,
}: {
  dataset: CampusExportDataset
  campus?: string | null
}) {
  const query = new URLSearchParams({ dataset })
  if (campus) query.set("campus", campus)

  return (
    <div className="flex flex-wrap gap-2">
      {FORMATS.map((format) => (
        <Button key={format.id} asChild size="sm" variant="outline" className="rounded-full">
          <a href={`/api/campus/export?${query.toString()}&format=${format.id}`}>
            <Download className="h-3.5 w-3.5" />
            {format.label}
          </a>
        </Button>
      ))}
    </div>
  )
}
