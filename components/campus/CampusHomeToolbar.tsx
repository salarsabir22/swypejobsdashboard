"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { ChevronDown, Download } from "lucide-react"
import { CAMPUS_RANGE_OPTIONS, type CampusRangeId } from "@/lib/campus/range"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const RANGE_LABEL: Record<string, string> = {
  day: "Last 24 hours",
  week: "Last 7 days",
  month: "Last 30 days",
  quarter: "Last quarter",
  year: "Last year",
  all: "All time",
}

export function CampusHomeToolbar({
  current,
  campus,
  canExport,
}: {
  current?: CampusRangeId | null
  campus?: string | null
  canExport?: boolean
}) {
  const pathname = usePathname()
  const params = useSearchParams()
  const active = current || params.get("range") || "month"

  function hrefFor(id: string) {
    const next = new URLSearchParams(params.toString())
    if (id === "month") next.delete("range")
    else next.set("range", id)
    return next.toString() ? `${pathname}?${next.toString()}` : pathname
  }

  const exportQuery = new URLSearchParams({ dataset: "overview" })
  if (campus) exportQuery.set("campus", campus)
  if (active && active !== "month") exportQuery.set("range", active)

  return (
    <div className="flex flex-wrap items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="h-11 rounded-full border-[rgba(5,28,44,0.16)] px-4 text-[#051C2C] hover:bg-[rgba(5,28,44,0.04)] hover:text-[#051C2C]"
          >
            {RANGE_LABEL[active] || "Last 30 days"}
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {CAMPUS_RANGE_OPTIONS.filter((option) => option.id !== "day").map((option) => (
            <DropdownMenuItem key={option.id} asChild>
              <Link href={hrefFor(option.id)}>{RANGE_LABEL[option.id]}</Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {canExport ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="h-11 rounded-full bg-[#2251FF] px-4 text-white hover:bg-[#3A66FF]">
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
