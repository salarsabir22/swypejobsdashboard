import Link from "next/link"
import type { CompletenessItem } from "@/lib/profile/completeness"
import { Card, CardContent } from "@/components/ui/card"

export function CompletenessCard({ percent, items }: { percent: number; items: CompletenessItem[] }) {
  const remaining = items.filter((item) => !item.done).slice(0, 3)

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex items-end justify-between gap-2">
          <p className="text-[14px] font-medium text-muted-foreground">Profile strength</p>
          <p className="text-[2rem] font-semibold leading-none tabular-nums tracking-[-0.05em]">{percent}%</p>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#5a48ff] to-[#3ee0a8] transition-[width]"
            style={{ width: `${percent}%` }}
          />
        </div>
        {remaining.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">Your profile is complete.</p>
        ) : (
          <ul className="space-y-2">
            {remaining.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-2 rounded-xl bg-secondary/60 px-3 py-2 text-[13px]"
              >
                <span className="truncate text-foreground">{item.label}</span>
                <Link href={item.href} className="shrink-0 font-semibold text-primary hover:underline">
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
