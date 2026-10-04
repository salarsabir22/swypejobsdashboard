type DashboardPageHeaderProps = {
  eyebrow: string
  title: string
  description: string
  action?: React.ReactNode
}

export function DashboardPageHeader({ eyebrow, title, description, action }: DashboardPageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-1">
        <p className="font-data text-[10px] font-medium uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]">
          {title}
        </h1>
        <p className="font-body max-w-xl text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  )
}
