import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export type DashboardPageHeaderProps = {
  eyebrow?: string
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
}

export function DashboardPageHeader({
  eyebrow,
  title,
  description,
  action,
  className,
}: DashboardPageHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-8", className)}>
      <div className="min-w-0 max-w-2xl space-y-1.5">
        {eyebrow ? <p className="font-body text-sm font-medium text-primary">{eyebrow}</p> : null}
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-[2.35rem] sm:leading-[1.05]">
          {title}
        </h1>
        {description ? (
          <div className="font-body max-w-xl text-sm leading-relaxed text-muted-foreground">{description}</div>
        ) : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
    </header>
  )
}
