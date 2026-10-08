import { DashboardPanel } from "@/components/dashboard/DashboardPanel"
import type { CountRow } from "@/lib/campus/types"

export function BreakdownList({
  title,
  description,
  rows,
  empty = "Nothing in this slice yet.",
}: {
  title: string
  description?: string
  rows: CountRow[]
  empty?: string
}) {
  const max = Math.max(...rows.map((r) => r.value), 1)
  return (
    <DashboardPanel title={title} description={description}>
      {rows.length === 0 ? (
        <p className="text-[14px] text-muted-foreground">{empty}</p>
      ) : (
        <ul className="space-y-3">
          {rows.slice(0, 12).map((row) => (
            <li key={row.label}>
              <div className="mb-1 flex items-center justify-between gap-3 text-[13px]">
                <span className="truncate">{row.label}</span>
                <span className="tabular-nums text-muted-foreground">{row.value}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#5a48ff] to-[#3ee0a8]"
                  style={{ width: `${Math.max(6, (row.value / max) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </DashboardPanel>
  )
}
