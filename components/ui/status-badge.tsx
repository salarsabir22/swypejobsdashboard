import { Badge } from "@/components/ui/badge"
import { humanLabel, statusTone } from "@/lib/status-label"
import { cn } from "@/lib/utils"

export function StatusBadge({
  value,
  className,
}: {
  value: string | null | undefined
  className?: string
}) {
  if (!value) return null
  return (
    <Badge variant={statusTone(value)} className={cn("font-medium", className)}>
      {humanLabel(value)}
    </Badge>
  )
}
