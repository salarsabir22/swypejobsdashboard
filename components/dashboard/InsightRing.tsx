"use client"

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts"
import { chartMuted, chartPrimary, chartTrack } from "@/components/dashboard/chart-theme"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function InsightRing({
  value,
  label,
  caption,
  emptyLabel,
  detail,
}: {
  value: number
  label: string
  caption: string
  emptyLabel: string
  detail?: string
}) {
  const clamped = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0
  const hasValue = clamped > 0
  const data = [
    { name: "filled", value: hasValue ? clamped : 8 },
    { name: "rest", value: hasValue ? 100 - clamped : 92 },
  ]

  return (
    <Card className="flex h-full min-h-[240px] flex-col">
      <CardHeader className="pb-2">
        <CardDescription className="font-data text-[10px] uppercase tracking-[0.16em]">{label}</CardDescription>
        <CardTitle className="font-body text-sm font-medium">{caption}</CardTitle>
      </CardHeader>
      <CardContent className="relative flex flex-1 items-center justify-center pt-0">
        <div className="h-[200px] w-full max-w-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                innerRadius="72%"
                outerRadius="92%"
                startAngle={90}
                endAngle={-270}
                stroke="none"
                isAnimationActive={false}
              >
                <Cell fill={hasValue ? chartPrimary : chartMuted} />
                <Cell fill={chartTrack} />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="font-heading text-3xl font-semibold tabular-nums tracking-tight text-foreground">
            {hasValue ? `${clamped}%` : "—"}
          </p>
          <p className="mt-1 max-w-[9rem] text-center font-body text-[11px] leading-snug text-muted-foreground">
            {hasValue ? detail ?? "of applications matched" : emptyLabel}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
