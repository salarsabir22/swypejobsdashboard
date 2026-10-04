import { cn } from "@/lib/utils"

type DiscoverHeaderProps = {
  eyebrow: string
  title: string
  description: React.ReactNode
  action?: React.ReactNode
  className?: string
}

export function DiscoverHeader({ eyebrow, title, description, action, className }: DiscoverHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-8",
        className
      )}
    >
      <div className="min-w-0 max-w-2xl space-y-2">
        <p className="font-data text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">{eyebrow}</p>
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem] sm:leading-snug">
          {title}
        </h1>
        <div className="font-body text-sm leading-relaxed text-muted-foreground">{description}</div>
      </div>
      {action ? <div className="w-full shrink-0 sm:w-auto">{action}</div> : null}
    </div>
  )
}
