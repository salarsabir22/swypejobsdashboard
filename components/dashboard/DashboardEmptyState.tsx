import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

type DashboardEmptyStateProps = {
  icon: LucideIcon
  title: string
  description: string
  primaryAction?: { href: string; label: string }
  secondaryAction?: { href: string; label: string }
}

export function DashboardEmptyState({
  icon: Icon,
  title,
  description,
  primaryAction,
  secondaryAction,
}: DashboardEmptyStateProps) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-border bg-muted/25 px-6 py-12 text-center">
      <div className="rounded-2xl bg-muted/80 p-3 text-muted-foreground">
        <Icon className="h-8 w-8" strokeWidth={1.25} aria-hidden />
      </div>
      <h3 className="font-heading mt-4 text-base font-semibold text-foreground">{title}</h3>
      <p className="font-body mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{description}</p>
      {(primaryAction || secondaryAction) && (
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          {primaryAction ? (
            <Button asChild>
              <Link href={primaryAction.href}>{primaryAction.label}</Link>
            </Button>
          ) : null}
          {secondaryAction ? (
            <Button asChild variant="outline">
              <Link href={secondaryAction.href}>{secondaryAction.label}</Link>
            </Button>
          ) : null}
        </div>
      )}
    </div>
  )
}
