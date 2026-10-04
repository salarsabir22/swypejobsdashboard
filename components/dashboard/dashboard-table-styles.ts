import { cn } from "@/lib/utils"

/** Shared class names for dashboard data tables - use with shadcn `Table`, `TableHead`, `TableCell` */
export const dashTable = {
  /** Outer scroll + frame inside a panel */
  frame: "rounded-xl border border-border bg-muted/20",

  /** TableHead - use with `TableRow` using `headerRow` on the header row */
  head: "font-data text-[9px] font-medium uppercase tracking-wider text-muted-foreground",
  headerRow: "border-b border-border bg-muted/50 hover:bg-muted/50",

  cell: "font-body text-foreground",
  cellMuted: "font-body text-muted-foreground",
  cellNum: "text-right font-body tabular-nums text-foreground",

  link: "font-medium text-primary underline-offset-2 hover:underline hover:opacity-90",

  empty: "font-body text-sm text-muted-foreground px-3 py-6",
}
