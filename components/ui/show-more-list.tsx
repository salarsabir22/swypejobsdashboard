"use client"

import { Fragment, useState, type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function useShowMore<T>(items: T[], initial = 6, step = 6) {
  const [visible, setVisible] = useState(initial)
  const shown = items.slice(0, visible)
  const remaining = Math.max(0, items.length - shown.length)
  return {
    shown,
    remaining,
    showMore: () => setVisible((count) => count + step),
  }
}

export function ShowMoreButton({
  remaining,
  onClick,
  className,
}: {
  remaining: number
  onClick: () => void
  className?: string
}) {
  if (remaining <= 0) return null
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn("h-11 w-full gap-1.5 rounded-none text-sm font-medium", className)}
      onClick={onClick}
    >
      Show more
      <span className="tabular-nums text-muted-foreground">{remaining}</span>
    </Button>
  )
}

export function ShowMoreList<T>({
  items,
  getKey,
  initial = 6,
  step = 6,
  renderItem,
  footer,
}: {
  items: T[]
  getKey: (item: T) => string
  initial?: number
  step?: number
  renderItem: (item: T, index: number) => ReactNode
  footer?: (remaining: number, showMore: () => void) => ReactNode
}) {
  const { shown, remaining, showMore } = useShowMore(items, initial, step)
  return (
    <>
      {shown.map((item, index) => (
        <Fragment key={getKey(item)}>{renderItem(item, index)}</Fragment>
      ))}
      {footer ? footer(remaining, showMore) : <ShowMoreButton remaining={remaining} onClick={showMore} />}
    </>
  )
}
