"use client"

import { useId } from "react"
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { chartAxisTick } from "@/components/dashboard/chart-theme"
import { ChartTooltip } from "@/components/dashboard/ChartTooltip"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const NAVY = "#051C2C"
const BLUE = "#2251FF"
const GRID = "rgba(5, 28, 44, 0.08)"
const AXIS = "rgba(5, 28, 44, 0.16)"

export function CampusTrendChart({
  title,
  description,
  points,
  jobsKey = "jobs",
  appsKey = "applications",
  periodLabel = "Last 14 days",
}: {
  title: string
  description?: string
  points: { label: string; jobs?: number; applications?: number }[]
  jobsKey?: string
  appsKey?: string
  periodLabel?: string
}) {
  const hasJobs = points.some((point) => (point.jobs || 0) > 0)
  const hasApps = points.some((point) => (point.applications || 0) > 0)
  const gid = useId().replace(/:/g, "")

  return (
    <Card className="campus-raised min-w-0 border-0">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="font-heading text-lg font-semibold text-[#051C2C]">{title}</CardTitle>
          {description ? <p className="font-body text-sm text-[rgba(5,28,44,0.58)]">{description}</p> : null}
        </div>
        <CardDescription className="shrink-0 text-right text-[13px] font-medium text-[rgba(5,28,44,0.5)]">{periodLabel}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`${gid}-jobs`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={NAVY} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={NAVY} stopOpacity={0} />
                </linearGradient>
                <linearGradient id={`${gid}-apps`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={BLUE} stopOpacity={0.32} />
                  <stop offset="100%" stopColor={BLUE} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID} vertical={false} />
              <XAxis dataKey="label" tick={chartAxisTick} tickLine={false} axisLine={{ stroke: AXIS }} interval="preserveStartEnd" minTickGap={16} />
              <YAxis allowDecimals={false} tick={chartAxisTick} tickLine={false} axisLine={false} width={28} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, color: NAVY }} />
              {hasJobs || !hasApps ? (
                <Area type="monotone" dataKey="jobs" name={jobsKey} stroke={NAVY} fill={`url(#${gid}-jobs)`} strokeWidth={2.25} />
              ) : null}
              {hasApps || !hasJobs ? (
                <Area type="monotone" dataKey="applications" name={appsKey} stroke={BLUE} fill={`url(#${gid}-apps)`} strokeWidth={2} />
              ) : null}
            </AreaChart>
          </ResponsiveContainer>
          {!hasJobs && !hasApps ? (
            <p className="pointer-events-none absolute inset-x-8 top-12 text-center font-body text-sm text-muted-foreground">
              Axes are live. New posts and applications will fill this chart.
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
