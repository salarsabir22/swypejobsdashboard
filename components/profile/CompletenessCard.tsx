import Link from "next/link"
import type { CompletenessItem } from "@/lib/profile/completeness"
import { Card, CardContent } from "@/components/ui/card"

export function CompletenessCard({ percent, items }: { percent: number; items: CompletenessItem[] }) {
  const remaining = items.filter((item) => !item.done).slice(0, 3)

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="font-data text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Profile strength</p>
          <p className="font-heading text-sm font-semibold tabular-nums">{percent}%</p>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${percent}%` }} />
        </div>
        {remaining.length === 0 ? (
          <p className="font-body text-xs text-muted-foreground">Complete.</p>
        ) : (
          <ul className="space-y-1.5">
            {remaining.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate text-foreground">{item.label}</span>
                <Link href={item.href} className="shrink-0 font-medium text-primary hover:underline">
                  Add
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
