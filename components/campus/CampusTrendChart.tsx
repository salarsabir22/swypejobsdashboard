"use client"

import { useId } from "react"
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import {
  chartAxisLine,
  chartAxisTick,
  chartGridStroke,
  chartPrimary,
  chartSecondary,
} from "@/components/dashboard/chart-theme"
import { ChartTooltip } from "@/components/dashboard/ChartTooltip"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function CampusTrendChart({
  title,
  description,
  points,
  jobsKey = "jobs",
  appsKey = "applications",
}: {
  title: string
  description?: string
  points: { label: string; jobs?: number; applications?: number }[]
  jobsKey?: string
  appsKey?: string
}) {
  const hasJobs = points.some((point) => (point.jobs || 0) > 0)
  const hasApps = points.some((point) => (point.applications || 0) > 0)
  const gid = useId().replace(/:/g, "")

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader className="pb-2">
        <CardDescription className="font-data text-[10px] uppercase tracking-[0.16em]">Last 14 days</CardDescription>
        <CardTitle className="font-body text-sm font-medium">{title}</CardTitle>
        {description ? <p className="font-body text-sm text-muted-foreground">{description}</p> : null}
      </CardHeader>
      <CardContent>
        <div className="relative h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`${gid}-jobs`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chartPrimary} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={chartPrimary} stopOpacity={0} />
                </linearGradient>
                <linearGradient id={`${gid}-apps`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chartSecondary} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={chartSecondary} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={chartGridStroke} vertical={false} />
              <XAxis dataKey="label" tick={chartAxisTick} tickLine={false} axisLine={{ stroke: chartAxisLine }} interval="preserveStartEnd" minTickGap={16} />
              <YAxis allowDecimals={false} tick={chartAxisTick} tickLine={false} axisLine={false} width={28} />
              <Tooltip content={<ChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: 11, color: "var(--muted-foreground)" }} />
              {hasJobs || !hasApps ? (
                <Area type="monotone" dataKey="jobs" name={jobsKey} stroke={chartPrimary} fill={`url(#${gid}-jobs)`} strokeWidth={2.25} />
              ) : null}
              {hasApps || !hasJobs ? (
                <Area type="monotone" dataKey="applications" name={appsKey} stroke={chartSecondary} fill={`url(#${gid}-apps)`} strokeWidth={2} />
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
