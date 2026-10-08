import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type DashboardPanelProps = {
  title: string
  description?: string
  badge?: string
  children: React.ReactNode
}

export function DashboardPanel({ title, description, badge, children }: DashboardPanelProps) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 space-y-0 border-b border-border sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <CardTitle className="font-heading text-lg">{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
        {badge ? (
          <Badge variant="secondary" className="w-fit px-3 py-1 text-[13px] text-primary">
            {badge}
          </Badge>
        ) : null}
      </CardHeader>
      <CardContent className="p-4 sm:p-5">{children}</CardContent>
    </Card>
  )
}
