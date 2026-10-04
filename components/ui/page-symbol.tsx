import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type PageSymbolProps = {
  icon: LucideIcon
  className?: string
  /** Apple-blue tint (default) or neutral gray plate */
  variant?: "tint" | "neutral"
}

/** SF Symbols-style page glyph: thin stroke, rounded plate. Use on page content only, not sidebar nav. */
export function PageSymbol({ icon: Icon, className, variant = "tint" }: PageSymbolProps) {
  return (
    <span
      className={cn(
        "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px]",
        variant === "tint" && "bg-primary/12 text-primary",
        variant === "neutral" && "bg-muted text-foreground",
        className
      )}
      aria-hidden
    >
      <Icon strokeWidth={1.5} className="h-[22px] w-[22px]" />
    </span>
  )
}
