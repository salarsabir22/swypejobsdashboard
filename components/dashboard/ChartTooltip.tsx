type TooltipItem = {
  dataKey?: string | number
  name?: string
  value?: number | string
  color?: string
}

export function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TooltipItem[]
  label?: string | number
}) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-xl border border-border bg-popover px-3 py-2.5 shadow-[0_16px_40px_rgba(0,0,0,0.4)]">
      {label ? (
        <p className="font-data mb-1.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      ) : null}
      <ul className="space-y-1">
        {payload.map((item) => (
          <li key={String(item.dataKey ?? item.name)} className="flex items-center gap-2 font-body text-xs text-foreground">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: String(item.color ?? "var(--primary)") }}
              aria-hidden
            />
            <span className="text-muted-foreground">{item.name}</span>
            <span className="ml-auto tabular-nums font-medium">{item.value ?? 0}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
