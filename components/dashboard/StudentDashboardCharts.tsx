"use client"

import {
  ResponsiveContainer,
  AreaChart,
  Area,
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

export type StudentActivityPoint = { label: string; applied: number; saved: number }
export type StudentMatchesPoint = { label: string; matches: number }

export function StudentDashboardCharts({
  activity,
  matchesSeries,
  matchRate,
  footnote,
}: {
  activity: StudentActivityPoint[]
  matchesSeries: StudentMatchesPoint[]
  matchRate: number
  footnote?: string
}) {
  const hasActivity = activity.some((p) => p.applied > 0 || p.saved > 0)
  const hasMatches = matchesSeries.some((p) => p.matches > 0)

  return (
    <div className="space-y-3">
      {footnote ? (
        <p className="font-body text-[13px] leading-relaxed text-muted-foreground">{footnote}</p>
      ) : null}
      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5">
        <Card className="min-w-0 overflow-hidden lg:col-span-2">
          <CardHeader className="pb-2">
            <CardDescription className="font-data text-[10px] uppercase tracking-[0.16em]">Applications</CardDescription>
            <CardTitle className="font-body text-sm font-medium">Applied vs saved · 30 days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activity} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="appliedFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={chartPrimary} stopOpacity={0.45} />
                      <stop offset="100%" stopColor={chartPrimary} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="savedFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={chartSecondary} stopOpacity={0.28} />
                      <stop offset="100%" stopColor={chartSecondary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} vertical={false} />
                  <XAxis dataKey="label" tick={chartAxisTick} tickLine={false} axisLine={{ stroke: chartAxisLine }} interval="preserveStartEnd" minTickGap={18} />
                  <YAxis allowDecimals={false} tick={chartAxisTick} tickLine={false} axisLine={false} width={28} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, color: "var(--muted-foreground)" }} />
                  <Area type="monotone" dataKey="applied" name="Applied" stroke={chartPrimary} fill="url(#appliedFill)" strokeWidth={2.25} />
                  <Area type="monotone" dataKey="saved" name="Saved" stroke={chartSecondary} fill="url(#savedFill)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
              {!hasActivity ? (
                <p className="pointer-events-none absolute inset-x-8 top-10 text-center font-body text-sm text-muted-foreground">
                  Axes are live. Swipe on Discover to fill this chart.
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <InsightRing
          value={matchRate}
          label="Match rate"
          caption="Mutual matches ÷ applications"
          emptyLabel="Apply to see a rate"
          detail="of applications matched"
        />

        <Card className="min-w-0 overflow-hidden lg:col-span-3">
          <CardHeader className="pb-2">
            <CardDescription className="font-data text-[10px] uppercase tracking-[0.16em]">New matches</CardDescription>
            <CardTitle className="font-body text-sm font-medium">Mutual matches per day · 30 days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={matchesSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="matchesFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={chartPrimary} stopOpacity={0.5} />
                    <stop offset="100%" stopColor={chartPrimary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} vertical={false} />
                <XAxis dataKey="label" tick={chartAxisTick} tickLine={false} axisLine={{ stroke: chartAxisLine }} interval="preserveStartEnd" minTickGap={18} />
                <YAxis allowDecimals={false} tick={chartAxisTick} tickLine={false} axisLine={false} width={28} />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="matches"
                  name="Matches"
                  stroke={chartPrimary}
                  fill="url(#matchesFill)"
                  strokeWidth={2.25}
                />
              </AreaChart>
            </ResponsiveContainer>
            {!hasMatches ? (
              <p className="pointer-events-none absolute inset-x-8 top-8 text-center font-body text-sm text-muted-foreground">
                New matches will plot here as recruiters return interest.
              </p>
            ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
