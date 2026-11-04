import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

const TONE = {
  navy: {
    card: "bg-[linear-gradient(165deg,#0b3a54_0%,#051C2C_58%,#03141e_100%)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.22),inset_0_-16px_28px_rgba(0,0,0,0.28),0_12px_20px_-10px_rgba(5,28,44,0.45),0_32px_56px_-18px_rgba(5,28,44,0.55)]",
    sheen: "from-white/20",
    icon: "bg-white/12 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_10px_18px_-8px_rgba(0,0,0,0.45)]",
    label: "text-white/65",
    detail: "text-white/60",
    delta: "bg-white/12 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]",
    deltaDown: "bg-white/8 text-white/65",
  },
  blue: {
    card: "bg-[linear-gradient(165deg,#3A66FF_0%,#2251FF_55%,#1a44e8_100%)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),inset_0_-16px_28px_rgba(5,28,44,0.18),0_12px_20px_-10px_rgba(34,81,255,0.45),0_32px_56px_-18px_rgba(34,81,255,0.5)]",
    sheen: "from-white/25",
    icon: "bg-white/15 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_10px_18px_-8px_rgba(5,28,44,0.35)]",
    label: "text-white/75",
    detail: "text-white/75",
    delta: "bg-white/15 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28)]",
    deltaDown: "bg-white/10 text-white/70",
  },
  wash: {
    card: "bg-[linear-gradient(180deg,#ffffff_0%,#eef2f5_100%)] text-[#051C2C] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),inset_0_-14px_24px_rgba(5,28,44,0.05),0_12px_20px_-10px_rgba(5,28,44,0.18),0_32px_56px_-18px_rgba(5,28,44,0.28)]",
    sheen: "from-white/80",
    icon: "bg-white text-[#2251FF] shadow-[inset_0_1px_0_rgba(255,255,255,1),0_10px_18px_-8px_rgba(5,28,44,0.28)]",
    label: "text-[rgba(5,28,44,0.58)]",
    detail: "text-[rgba(5,28,44,0.52)]",
    delta: "bg-[#2251FF]/10 text-[#2251FF] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]",
    deltaDown: "bg-[rgba(5,28,44,0.08)] text-[rgba(5,28,44,0.5)]",
  },
  white: {
    card: "bg-white text-[#051C2C] shadow-[inset_0_1px_0_rgba(255,255,255,1),inset_0_-14px_24px_rgba(5,28,44,0.04),0_12px_20px_-10px_rgba(5,28,44,0.16),0_32px_56px_-18px_rgba(5,28,44,0.28)]",
    sheen: "from-white",
    icon: "bg-[#2251FF]/10 text-[#2251FF] shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_10px_18px_-8px_rgba(34,81,255,0.35)]",
    label: "text-[rgba(5,28,44,0.58)]",
    detail: "text-[rgba(5,28,44,0.52)]",
    delta: "bg-[#2251FF]/10 text-[#2251FF] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]",
    deltaDown: "bg-[rgba(5,28,44,0.08)] text-[rgba(5,28,44,0.5)]",
  },
} as const

export function CampusHomeKpi({
  href,
  icon: Icon,
  label,
  value,
  delta,
  detail,
  tone = "navy",
}: {
  href: string
  icon: LucideIcon
  label: string
  value: string | number
  delta?: number | null
  detail?: string | null
  tone?: keyof typeof TONE
}) {
  const t = TONE[tone]
  const deltaLabel = delta == null ? null : `${delta > 0 ? "+" : ""}${delta}%`

  return (
    <Link
      href={href}
      className={cn(
        "relative flex min-h-[11.25rem] flex-col justify-between overflow-hidden rounded-[2rem] p-5 transition-transform hover:-translate-y-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2251FF] focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:translate-y-0 sm:p-6",
        t.card
      )}
    >
      <span className={cn("pointer-events-none absolute inset-0 bg-gradient-to-b to-transparent", t.sheen)} />
      <span className="relative z-10 flex items-start justify-between gap-3">
        <span className={cn("grid size-12 shrink-0 place-items-center rounded-full", t.icon)}>
          <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
        </span>
        {deltaLabel ? (
          <span className={cn("rounded-full px-2.5 py-1 text-[12px] font-semibold tabular-nums", delta && delta < 0 ? t.deltaDown : t.delta)}>
            {deltaLabel}
          </span>
        ) : null}
      </span>
      <span className="relative z-10 mt-6">
        <span className={cn("block text-[12px] font-medium uppercase tracking-[0.08em]", t.label)}>{label}</span>
        <span className="mt-1.5 block text-[2.15rem] font-semibold leading-none tabular-nums tracking-[-0.04em] sm:text-[2.45rem]">
          {value}
        </span>
        {detail ? <span className={cn("mt-2.5 block text-[13px] leading-snug", t.detail)}>{detail}</span> : null}
      </span>
    </Link>
  )
}
