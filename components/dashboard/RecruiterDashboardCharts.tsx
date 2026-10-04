"use client"

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"
import {
  chartAxisLine,
  chartAxisTick,
  chartGridStroke,
  chartPrimary,
  chartSecondary,
} from "@/components/dashboard/chart-theme"
import { ChartTooltip } from "@/components/dashboard/ChartTooltip"
import { InsightRing } from "@/components/dashboard/InsightRing"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export type RecruiterTimelinePoint = { label: string; applications: number; matches: number }
export type RecruiterJobBarPoint = { name: string; applications: number }

export function RecruiterDashboardCharts({
  timeline,
  jobBars,
  conversionRate,
  footnote,
}: {
  timeline: RecruiterTimelinePoint[]
  jobBars: RecruiterJobBarPoint[]
  conversionRate: number
  footnote?: string
}) {
  const hasTimeline = timeline.some((p) => p.applications > 0 || p.matches > 0)
  const hasBars = jobBars.some((p) => p.applications > 0)
  const bars = hasBars ? jobBars : [{ name: "No roles yet", applications: 0 }]

  return (
    <div className="space-y-3">
      {footnote ? (
        <p className="font-body text-[13px] leading-relaxed text-muted-foreground">{footnote}</p>
      ) : null}
      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5">
        <Card className="min-w-0 overflow-hidden lg:col-span-2">
          <CardHeader className="pb-2">
            <CardDescription className="font-data text-[10px] uppercase tracking-[0.16em]">Pipeline trend</CardDescription>
            <CardTitle className="font-body text-sm font-medium">Applications vs matches · 30 days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeline} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="appsFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartSecondary} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={chartSecondary} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="matchFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartPrimary} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={chartPrimary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} vertical={false} />
                <XAxis dataKey="label" tick={chartAxisTick} tickLine={false} axisLine={{ stroke: chartAxisLine }} interval="preserveStartEnd" minTickGap={18} />
                <YAxis allowDecimals={false} tick={chartAxisTick} tickLine={false} axisLine={false} width={28} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, color: "var(--muted-foreground)" }} />
                <Area
                  type="monotone"
                  dataKey="applications"
                  name="Applications"
                  stroke={chartSecondary}
                  fill="url(#appsFill)"
                  strokeWidth={2.25}
                />
                <Area
                  type="monotone"
                  dataKey="matches"
                  name="Matches"
                  stroke={chartPrimary}
                  fill="url(#matchFill)"
                  strokeWidth={2.25}
                />
              </AreaChart>
            </ResponsiveContainer>
            {!hasTimeline ? (
              <p className="pointer-events-none absolute inset-x-8 top-10 text-center font-body text-sm text-muted-foreground">
                Axes are live. Inbound swipes will fill this chart.
              </p>
            ) : null}
            </div>
          </CardContent>
        </Card>

        <InsightRing
          value={conversionRate}
          label="Conversion"
          caption="Matches ÷ inbound applications"
          emptyLabel="Need inbound to chart conversion"
          detail="inbound converted"
        />

        <Card className="min-w-0 overflow-hidden lg:col-span-3">
          <CardHeader className="pb-2">
            <CardDescription className="font-data text-[10px] uppercase tracking-[0.16em]">Volume by role</CardDescription>
            <CardTitle className="font-body text-sm font-medium">Applications per posting</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={bars} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={chartAxisTick} tickLine={false} axisLine={{ stroke: chartAxisLine }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={72}
                  tick={{ ...chartAxisTick, fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="applications" name="Applications" fill={chartPrimary} radius={[0, 8, 8, 0]} maxBarSize={22} />
              </BarChart>
            </ResponsiveContainer>
            {!hasBars ? (
              <p className="pointer-events-none absolute inset-x-8 top-8 text-center font-body text-sm text-muted-foreground">
                Post a role to start collecting inbound applications.
              </p>
            ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
