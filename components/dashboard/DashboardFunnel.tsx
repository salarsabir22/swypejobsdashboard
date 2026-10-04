import { cn } from "@/lib/utils"

export type FunnelStage = { label: string; value: number }

export function DashboardFunnel({
  title,
  stages,
}: {
  title: string
  stages: FunnelStage[]
}) {
  const max = Math.max(...stages.map((s) => s.value), 1)

  return (
    <div className="space-y-3">
      <h2 className="font-heading text-base font-semibold tracking-tight">{title}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stages.map((stage, index) => (
          <div key={stage.label} className="rounded-xl border border-border bg-card p-4">
            <p className="font-heading text-2xl font-semibold tabular-nums text-foreground">{stage.value}</p>
            <p className="mt-1 font-body text-xs text-muted-foreground">{stage.label}</p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn("h-full rounded-full bg-primary/80")}
                style={{ width: `${Math.max(8, (stage.value / max) * 100)}%`, opacity: 1 - index * 0.12 }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
