"use client"

import { useState, type ReactNode } from "react"
import { Info } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export function InfoTip({
  label,
  children,
  side = "top",
  className,
}: {
  label: string
  children: ReactNode
  side?: "top" | "bottom" | "left" | "right"
  className?: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          <button
            type="button"
            className={cn(
              "inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              className
            )}
            aria-label={label}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              setOpen((current) => !current)
            }}
          >
            <Info className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side={side}
          className="max-w-[min(18rem,calc(100vw-2rem))] space-y-1 text-left font-body text-xs leading-relaxed"
        >
          <p className="font-data text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
          <div className="text-popover-foreground">{children}</div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

