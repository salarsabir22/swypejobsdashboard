import type { LucideIcon } from "lucide-react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export type DiscoverStatItem = {
  label: string
  value: number | string
  hint?: string
  /** Secondary line under the label (e.g. “12% of applications”) */
  sub?: string
  icon?: LucideIcon
}

type DiscoverStatStripProps = {
  items: DiscoverStatItem[]
  caption?: string
  className?: string
  /** Default 3. Use 2 for job detail KPIs, 4 for jobs list overview. */
  columns?: 2 | 3 | 4
}

export function DiscoverStatStrip({ items, caption, className, columns = 3 }: DiscoverStatStripProps) {
  const gridClass =
    columns === 2
      ? "grid grid-cols-2 divide-x divide-border bg-card"
      : columns === 4
        ? "grid grid-cols-2 gap-px bg-border lg:grid-cols-4"
        : "grid grid-cols-3 divide-x divide-border bg-card"

  return (
    <div className={cn("space-y-2", className)}>
      {caption ? (
        <p className="font-data text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{caption}</p>
      ) : null}
      <Card className="overflow-hidden p-0 shadow-sm">
        <div className={gridClass}>
          {items.map(({ label, value, hint, sub, icon: Icon }) => (
            <div
              key={label}
              className={cn(
                "group relative px-2.5 py-3 text-center sm:px-5 sm:py-4 sm:text-left",
                columns === 4 && "bg-card"
              )}
              title={hint}
            >
              <div className="flex items-center justify-center gap-2 sm:justify-start">
                {Icon ? (
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground opacity-80 group-hover:opacity-100" aria-hidden />
                ) : null}
                <p className="font-heading text-2xl font-semibold tabular-nums tracking-tight text-foreground">{value}</p>
              </div>
              <p className="mt-1 font-body text-[11px] font-medium leading-tight text-muted-foreground">{label}</p>
              {sub ? <p className="mt-0.5 font-body text-[10px] text-muted-foreground/90">{sub}</p> : null}
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
