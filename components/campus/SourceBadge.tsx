import { sourceLabel } from "@/lib/campus/format"
import type { DataSource } from "@/lib/campus/types"

export function SourceBadge({ source }: { source: DataSource }) {
  return (
    <span className="inline-flex rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
      {sourceLabel(source)}
    </span>
  )
}
