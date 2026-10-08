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
    <div className="space-y-4">
      <h2 className="font-heading text-xl font-semibold tracking-[-0.03em]">{title}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stages.map((stage) => (
          <div
            key={stage.label}
            className="rounded-2xl border border-border bg-card p-5 shadow-[0_10px_30px_-20px_rgba(90,72,255,0.35)]"
          >
            <p className="text-[2rem] font-semibold leading-none tabular-nums tracking-[-0.045em] text-foreground">
              {stage.value}
            </p>
            <p className="mt-2 text-[13px] font-medium text-muted-foreground">{stage.label}</p>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#5a48ff] to-[#3ee0a8]"
                style={{ width: `${Math.max(8, (stage.value / max) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
