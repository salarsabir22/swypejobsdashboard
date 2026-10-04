import type { CSSProperties } from "react"
import { cn } from "@/lib/utils"

type AppleActivityIndicatorProps = {
  size?: number
  className?: string
  label?: string
}

/** Classic iOS 12-spoke activity indicator (UIActivityIndicatorView). */
export function AppleActivityIndicator({
  size = 36,
  className,
  label,
}: AppleActivityIndicatorProps) {
  return (
    <div
      className={cn("apple-activity-indicator", className)}
      style={{ width: size, height: size }}
      role="status"
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {Array.from({ length: 12 }, (_, i) => (
        <span key={i} style={{ "--i": i } as CSSProperties} />
      ))}
    </div>
  )
}
