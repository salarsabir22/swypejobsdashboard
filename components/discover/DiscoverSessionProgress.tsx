import { formatDistanceToNow } from "date-fns"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type DiscoverSessionProgressProps = {
  position: number
  total: number
  loadedAt: Date | null
  className?: string
  noun?: string
  description?: string
  compact?: boolean
}

export function DiscoverSessionProgress({
  position,
  total,
  loadedAt,
  className,
  noun = "roles",
  description,
  compact = false,
}: DiscoverSessionProgressProps) {
  const safeTotal = Math.max(total, 0)
  const current = safeTotal === 0 ? 0 : Math.min(Math.max(position, 1), safeTotal)
  const pct = safeTotal > 0 ? Math.round(((current - (safeTotal === 0 ? 0 : 1)) / safeTotal) * 100) : 0
  const copy =
    description ?? `Ranked by fit. Passing doesn’t notify anyone.`

  if (compact) {
    return (
      <div className={cn("space-y-1.5", className)}>
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 truncate font-body text-xs text-muted-foreground">
            {safeTotal > 0 ? `${current} of ${safeTotal} ${noun}` : `No ${noun} in this stack`}
            {description ? ` · ${description}` : ""}
          </p>
          {loadedAt ? (
            <p className="hidden shrink-0 font-data text-[10px] tabular-nums text-muted-foreground sm:block">
              {formatDistanceToNow(loadedAt, { addSuffix: true })}
            </p>
          ) : null}
        </div>
        <div
          className="h-1 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progress through this stack"
        >
          <div className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out" style={{ width: `${pct}%` }} />
        </div>
      </div>
    )
  }

  return (
    <Card className={cn("overflow-hidden p-4 shadow-sm sm:p-5", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="min-w-0 space-y-0.5">
          <p className="font-body text-sm font-semibold tracking-tight text-foreground">
            Session · Card {Math.min(position, Math.max(total, 1))} of {total}
          </p>
          <p className="font-body text-xs text-muted-foreground">{copy}</p>
        </div>
        {loadedAt ? (
          <p className="shrink-0 font-data text-[11px] tabular-nums text-muted-foreground sm:text-right">
            Loaded {formatDistanceToNow(loadedAt, { addSuffix: true })}
          </p>
        ) : null}
      </div>
      <div
        className="mt-4 h-1.5 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Progress through this batch"
      >
        <div className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out" style={{ width: `${pct}%` }} />
      </div>
    </Card>
  )
}
