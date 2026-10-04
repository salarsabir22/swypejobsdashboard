import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export function DashboardFocusBanner({
  kicker,
  title,
  description,
  href,
  cta,
}: {
  kicker: string
  title: string
  description: string
  href: string
  cta: string
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-border bg-card px-5 py-6 shadow-sm sm:px-8 sm:py-7">
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-xl space-y-1.5">
          <p className="font-data text-[10px] font-medium uppercase tracking-[0.18em] text-primary">{kicker}</p>
          <h2 className="font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{title}</h2>
          <p className="font-body text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
        <Button asChild className="shrink-0 rounded-full">
          <Link href={href}>
            {cta}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </Button>
      </div>
    </section>
  )
}
