import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export function DashboardFocusBanner({
  title,
  description,
  href,
  cta,
}: {
  kicker?: string
  title: string
  description: string
  href: string
  cta: string
}) {
  return (
    <section className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-[#6d5cff] via-[#5a48ff] to-[#3a2bc8] px-6 py-8 text-white shadow-[0_28px_70px_-32px_rgba(90,72,255,0.9)] sm:px-10 sm:py-10">
      <div className="lp-grid pointer-events-none absolute inset-0 -z-10 opacity-70" aria-hidden />
      <div
        className="pointer-events-none absolute -right-20 -top-28 -z-10 size-80 rounded-full bg-[#3ee0a8]/30 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-32 left-1/3 -z-10 size-72 rounded-full bg-white/10 blur-3xl"
        aria-hidden
      />
      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-xl">
          <h2 className="text-[clamp(1.7rem,3.2vw,2.4rem)] font-semibold leading-[1.05] tracking-[-0.045em] text-white">
            {title}
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-white/80">{description}</p>
        </div>
        <Button
          asChild
          className="h-12 shrink-0 bg-white px-6 text-[15px] font-semibold text-[#3a2bc8] hover:bg-white/90"
        >
          <Link href={href}>
            {cta}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </Button>
      </div>
    </section>
  )
}
