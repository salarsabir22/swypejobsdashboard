import type { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { KpiSparkline } from "@/components/dashboard/KpiSparkline"
import { cn } from "@/lib/utils"

const TONE = {
  blue: "bg-[#eff6ff] text-[#1e3a5f]",
  teal: "bg-emerald-50 text-emerald-800",
  violet: "bg-violet-50 text-violet-800",
  amber: "bg-amber-50 text-amber-900",
} as const

type DashboardKpiCardProps = {
  icon: LucideIcon
  label: string
  value: string | number
  hint?: string | null
  trend?: number[]
  tone?: keyof typeof TONE
}

export function DashboardKpiCard({ icon: Icon, label, value, hint, trend, tone = "blue" }: DashboardKpiCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className={cn("rounded-xl p-2.5", TONE[tone])}>
            <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
          </div>
          {trend && trend.some((n) => n > 0) ? <KpiSparkline values={trend} /> : null}
        </div>
        <p className="font-data mt-4 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
        <p className="font-heading mt-1.5 text-3xl font-semibold tabular-nums tracking-tight text-foreground">
          {value}
        </p>
        {hint ? <p className="font-body mt-2 text-[13px] leading-snug text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  )
}
