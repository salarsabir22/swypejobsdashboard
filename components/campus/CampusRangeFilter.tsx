"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { CalendarRange } from "lucide-react"
import {
  CAMPUS_RANGE_OPTIONS,
  applyCampusRangeParams,
  formatCustomRangeLabel,
  parseIsoDate,
  todayIso,
  type CampusRangeId,
} from "@/lib/campus/range"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export function CampusRangeFilter({
  current,
  from: currentFrom,
  to: currentTo,
}: {
  current?: CampusRangeId | null
  from?: string | null
  to?: string | null
}) {
  const pathname = usePathname()
  const router = useRouter()
  const params = useSearchParams()
  const paramFrom = parseIsoDate(params.get("from")) || currentFrom || null
  const paramTo = parseIsoDate(params.get("to")) || currentTo || null
  const isCustom = Boolean(paramFrom && paramTo) || current === "custom" || params.get("range") === "custom"
  const active = isCustom ? "custom" : current || params.get("range") || "month"

  const [open, setOpen] = useState(false)
  const [from, setFrom] = useState(paramFrom || "")
  const [to, setTo] = useState(paramTo || "")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setFrom(paramFrom || "")
    setTo(paramTo || "")
  }, [paramFrom, paramTo])

  function hrefForPreset(id: string) {
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
    setOpen(false)
    router.push(next.toString() ? `${pathname}?${next.toString()}` : pathname)
  }

  const customLabel =
    paramFrom && paramTo ? formatCustomRangeLabel(paramFrom, paramTo) : "Custom"

  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Report time range">
      {CAMPUS_RANGE_OPTIONS.map((option) => {
        const selected = active === option.id
        return (
          <Button
            key={option.id}
            asChild
            size="sm"
            variant={selected ? "default" : "outline"}
            className={cn(
              "h-9 rounded-full px-3.5 text-[13px] font-medium",
              !selected && "text-muted-foreground"
            )}
          >
            <Link href={hrefForPreset(option.id)} aria-current={selected ? "page" : undefined}>
              {option.label}
            </Link>
          </Button>
        )
      })}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            size="sm"
            variant={active === "custom" ? "default" : "outline"}
            className={cn(
              "h-9 rounded-full px-3.5 text-[13px] font-medium",
              active !== "custom" && "text-muted-foreground"
            )}
            aria-current={active === "custom" ? "page" : undefined}
          >
            <CalendarRange className="size-3.5" strokeWidth={1.75} />
            {customLabel}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
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
            <p className="mt-0.5 text-[13px] text-muted-foreground">Inclusive start and end dates for this report.</p>
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="campus-range-from">From</Label>
              <DatePicker
                id="campus-range-from"
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
              <Label htmlFor="campus-range-to">To</Label>
              <DatePicker
                id="campus-range-to"
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
            <Button type="button" variant="ghost" size="sm" className="rounded-full" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" className="rounded-full" onClick={applyCustom}>
              Apply
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
