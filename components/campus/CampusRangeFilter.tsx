"use client"

import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { CAMPUS_RANGE_OPTIONS, type CampusRangeId } from "@/lib/campus/range"
import { cn } from "@/lib/utils"

export function CampusRangeFilter({ current }: { current?: CampusRangeId | null }) {
  const pathname = usePathname()
  const params = useSearchParams()
  const active = current || params.get("range") || "month"

  return (
    <nav className="flex flex-wrap gap-1.5" aria-label="Report time range">
      {CAMPUS_RANGE_OPTIONS.map((option) => {
        const next = new URLSearchParams(params.toString())
        if (option.id === "month") next.delete("range")
        else next.set("range", option.id)
        const href = next.toString() ? `${pathname}?${next.toString()}` : pathname
        const selected = active === option.id
        return (
          <Link
            key={option.id}
            href={href}
            aria-current={selected ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 items-center rounded-full border px-3.5 text-[13px] font-medium",
              selected
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-secondary"
            )}
          >
            {option.label}
          </Link>
        )
      })}
    </nav>
  )
}
