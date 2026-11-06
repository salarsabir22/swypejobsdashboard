import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type DashboardPanelProps = {
  title: string
  description?: string
  badge?: string
  action?: React.ReactNode
  children: React.ReactNode
}

export function DashboardPanel({ title, description, badge, action, children }: DashboardPanelProps) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 space-y-0 border-b border-border sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <CardTitle className="font-heading text-lg">{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {badge ? (
            <Badge variant="secondary" className="w-fit px-3 py-1 text-[13px] text-primary">
              {badge}
            </Badge>
          ) : null}
          {action}
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-5">{children}</CardContent>
    </Card>
  )
}
