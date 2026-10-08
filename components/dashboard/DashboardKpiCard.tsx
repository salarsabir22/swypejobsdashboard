import type { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { KpiSparkline } from "@/components/dashboard/KpiSparkline"
import { cn } from "@/lib/utils"

const TONE = {
  blue: { chip: "bg-[#e9e6ff] text-[#4a39e0]", glow: "bg-[#5a48ff]/15", line: "text-[#5a48ff]" },
  teal: { chip: "bg-[#e6fbf2] text-[#0a7a56]", glow: "bg-[#3ee0a8]/25", line: "text-[#12b886]" },
  violet: { chip: "bg-[#efe9ff] text-[#6d3fe0]", glow: "bg-[#8b5cf6]/15", line: "text-[#7a54ff]" },
  amber: { chip: "bg-[#fff0ea] text-[#b3361d]", glow: "bg-[#ff7a5c]/20", line: "text-[#ff7a5c]" },
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
  const t = TONE[tone]
  return (
    <Card className="group relative overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_48px_-24px_rgba(90,72,255,0.55)]">
      <div
        className={cn(
          "pointer-events-none absolute -right-10 -top-12 size-32 rounded-full blur-2xl transition-opacity duration-300 group-hover:opacity-100",
          t.glow
        )}
        aria-hidden
      />
      <CardContent className="relative p-5">
        <div className="flex items-start justify-between gap-3">
          <div className={cn("rounded-2xl p-2.5", t.chip)}>
            <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
          </div>
          {trend && trend.some((n) => n > 0) ? <KpiSparkline values={trend} className={t.line} /> : null}
        </div>
        <p className="mt-5 text-[14px] font-medium text-muted-foreground">{label}</p>
        <p className="mt-1 text-[2.6rem] font-semibold leading-none tabular-nums tracking-[-0.05em] text-foreground">
          {value}
        </p>
        {hint ? <p className="mt-3 text-[13px] leading-snug text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  )
}
