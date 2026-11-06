"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { CalendarRange, ChevronDown, Download } from "lucide-react"
import {
  CAMPUS_RANGE_OPTIONS,
  applyCampusRangeParams,
  campusRangeQuery,
  formatCustomRangeLabel,
  parseIsoDate,
  todayIso,
  type CampusRangeId,
} from "@/lib/campus/range"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const RANGE_LABEL: Record<string, string> = {
  day: "Last 24 hours",
  week: "Last 7 days",
  month: "Last 30 days",
  quarter: "Last quarter",
  year: "Last year",
  all: "All time",
  custom: "Custom range",
}

export function CampusHomeToolbar({
  current,
  from: currentFrom,
  to: currentTo,
  campus,
  canExport,
}: {
  current?: CampusRangeId | null
  from?: string | null
  to?: string | null
  campus?: string | null
  canExport?: boolean
}) {
  const pathname = usePathname()
  const router = useRouter()
  const params = useSearchParams()
  const paramFrom = parseIsoDate(params.get("from")) || currentFrom || null
  const paramTo = parseIsoDate(params.get("to")) || currentTo || null
  const isCustom = Boolean(paramFrom && paramTo) || current === "custom"
  const active = isCustom ? "custom" : current || params.get("range") || "month"
  const [from, setFrom] = useState(paramFrom || "")
  const [to, setTo] = useState(paramTo || "")
  const [customOpen, setCustomOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setFrom(paramFrom || "")
    setTo(paramTo || "")
  }, [paramFrom, paramTo])

  function hrefFor(id: string) {
    const next = new URLSearchParams(params.toString())
    applyCampusRangeParams(next, { id })
    return next.toString() ? `${pathname}?${next.toString()}` : pathname
  }

  function applyCustom() {
    const start = parseIsoDate(from)
    const end = parseIsoDate(to)
    if (!start || !end) {
      setError("Choose both a start and end date.")
      return
    }
    if (start > end) {
      setError("Start date must be on or before the end date.")
      return
    }
    setError(null)
    const next = new URLSearchParams(params.toString())
    applyCampusRangeParams(next, { id: "custom", from: start, to: end })
    setCustomOpen(false)
    router.push(next.toString() ? `${pathname}?${next.toString()}` : pathname)
  }

  const exportQuery = new URLSearchParams({ dataset: "overview" })
  if (campus) exportQuery.set("campus", campus)
  const rangeParams = campusRangeQuery(
    isCustom && paramFrom && paramTo
      ? { id: "custom", from: paramFrom, to: paramTo }
      : { id: active as CampusRangeId }
  )
  for (const [key, value] of Object.entries(rangeParams)) exportQuery.set(key, value)

  const triggerLabel =
    isCustom && paramFrom && paramTo
      ? formatCustomRangeLabel(paramFrom, paramTo)
      : RANGE_LABEL[active] || "Last 30 days"

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="h-11 rounded-full px-4">
            {triggerLabel}
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[13rem]">
          {CAMPUS_RANGE_OPTIONS.filter((option) => option.id !== "day").map((option) => (
            <DropdownMenuItem key={option.id} asChild>
              <Link href={hrefFor(option.id)}>{RANGE_LABEL[option.id]}</Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Popover open={customOpen} onOpenChange={setCustomOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant={isCustom ? "default" : "outline"}
            className="h-11 rounded-full px-4"
            aria-label="Custom date range"
          >
            <CalendarRange className="h-4 w-4" strokeWidth={1.75} />
            Custom
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-[min(100vw-2rem,22rem)] space-y-3 p-4"
          onOpenAutoFocus={(event) => event.preventDefault()}
          onFocusOutside={(event) => event.preventDefault()}
          onPointerDownOutside={(event) => {
            const target = event.target as HTMLElement | null
            if (target?.closest("[data-radix-popper-content-wrapper]")) event.preventDefault()
          }}
        >
          <div>
            <p className="text-sm font-medium">Custom date range</p>
            <p className="mt-0.5 text-[13px] text-muted-foreground">Inclusive start and end dates.</p>
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="home-range-from">From</Label>
              <DatePicker
                id="home-range-from"
                value={from}
                max={to || todayIso()}
                onChange={(value) => {
                  setFrom(value)
                  setError(null)
                }}
                placeholder="Start date"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="home-range-to">To</Label>
              <DatePicker
                id="home-range-to"
                value={to}
                min={from || undefined}
                max={todayIso()}
                onChange={(value) => {
                  setTo(value)
                  setError(null)
                }}
                placeholder="End date"
              />
            </div>
          </div>
          {error ? <p className="text-[13px] text-destructive">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" className="rounded-full" onClick={() => setCustomOpen(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" className="rounded-full" onClick={applyCustom}>
              Apply
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {canExport ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="h-11 rounded-full px-4">
              Download reports
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {[
              { id: "csv", label: "CSV" },
              { id: "xls", label: "Excel" },
              { id: "pdf", label: "PDF" },
            ].map((format) => (
              <DropdownMenuItem key={format.id} asChild>
                <a href={`/api/campus/export?${exportQuery.toString()}&format=${format.id}`} download>
                  <Download className="h-4 w-4" />
                  {format.label}
                </a>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  )
}
