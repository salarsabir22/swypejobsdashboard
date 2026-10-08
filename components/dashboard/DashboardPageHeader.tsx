type DashboardPageHeaderProps = {
  eyebrow?: string
  title: React.ReactNode
  description: string
  action?: React.ReactNode
}

export function DashboardPageHeader({ title, description, action }: DashboardPageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-[2.6rem] sm:leading-[1.02]">
          {title}
        </h1>
        <p className="font-body max-w-xl text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  )
}
