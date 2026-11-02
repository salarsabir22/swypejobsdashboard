"use client"

import { useState } from "react"
import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { EXPORT_DATASETS, EXPORT_LABEL, exportHref, type ExportDataset, type ExportFormat, type ExportRange } from "@/lib/admin/export"

/** One-click CSV download of a full dataset. */
const FORMAT_SUFFIX: Record<ExportFormat, string> = { csv: "CSV", xls: "Excel", pdf: "PDF" }

export function ExportButton({
  dataset,
  range,
  label,
  format = "csv",
  size = "sm",
}: {
  dataset: ExportDataset
  range?: ExportRange
  label?: string
  format?: ExportFormat
  size?: "sm" | "default"
}) {
  return (
    <Button asChild size={size} variant="outline" className="rounded-full">
      <a href={exportHref(dataset, range, format)} download>
        <Download className="h-3.5 w-3.5" />
        {label || `${EXPORT_LABEL[dataset]} ${FORMAT_SUFFIX[format]}`}
      </a>
    </Button>
  )
}

type Period = "this_month" | "last_month" | "this_quarter" | "last_quarter" | "this_year" | "last_year" | "all" | "custom"

const PERIOD_LABEL: Record<Period, string> = {
  this_month: "This month",
  last_month: "Last month",
  this_quarter: "This quarter",
  last_quarter: "Last quarter",
  this_year: "This year",
  last_year: "Last year",
  all: "All time",
  custom: "Custom range",
}

function iso(d: Date) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function periodRange(period: Period, now = new Date()): ExportRange {
  const y = now.getFullYear()
  const m = now.getMonth()
  const q = Math.floor(m / 3)
  switch (period) {
    case "this_month":
      return { from: iso(new Date(y, m, 1)), to: iso(new Date(y, m + 1, 0)) }
    case "last_month":
      return { from: iso(new Date(y, m - 1, 1)), to: iso(new Date(y, m, 0)) }
    case "this_quarter":
      return { from: iso(new Date(y, q * 3, 1)), to: iso(new Date(y, q * 3 + 3, 0)) }
    case "last_quarter":
      return { from: iso(new Date(y, q * 3 - 3, 1)), to: iso(new Date(y, q * 3, 0)) }
    case "this_year":
      return { from: `${y}-01-01`, to: `${y}-12-31` }
    case "last_year":
      return { from: `${y - 1}-01-01`, to: `${y - 1}-12-31` }
    default:
      return {}
  }
}

/** Monthly / quarterly / annual report downloads for every dataset (spec §5.4). */
export function ReportExportPanel() {
  const [period, setPeriod] = useState<Period>("this_month")
  const [format, setFormat] = useState<ExportFormat>("csv")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const range: ExportRange = period === "custom" ? { from: from || null, to: to || null } : periodRange(period)

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="report-format" className="text-[13px]">
            Format
          </Label>
          <Select value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
            <SelectTrigger id="report-format" className="h-10 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="xls">Excel</SelectItem>
              <SelectItem value="pdf">PDF</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="report-period" className="text-[13px]">
            Period
          </Label>
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger id="report-period" className="h-10 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(PERIOD_LABEL) as Period[]).map((p) => (
                <SelectItem key={p} value={p}>
                  {PERIOD_LABEL[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {period === "custom" ? (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="report-from" className="text-[13px]">
                From
              </Label>
              <Input id="report-from" type="date" className="h-10 rounded-xl" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="report-to" className="text-[13px]">
                To
              </Label>
              <Input id="report-to" type="date" className="h-10 rounded-xl" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
            </div>
          </>
        ) : (
          <p className="self-end pb-2 text-[13px] text-muted-foreground">
            {range.from && range.to ? `${range.from} → ${range.to}` : "No date filter."} Rows are filtered by creation date.
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {EXPORT_DATASETS.map((dataset) => (
          <ExportButton key={dataset} dataset={dataset} range={range} format={format} />
        ))}
      </div>
      <p className="text-[12px] text-muted-foreground">
        CSV and Excel include up to 5,000 rows. PDF is a printable summary of the same table (first columns and rows). Every download is logged.
      </p>
    </div>
  )
}
