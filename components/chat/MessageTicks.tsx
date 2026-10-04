"use client"

import { CheckCheck, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export type MessageDeliveryStatus = "sending" | "sent" | "read"

type MessageTicksProps = {
  status: MessageDeliveryStatus
  /** Own bubble on primary (navy) - ticks use light/blue contrast */
  onPrimaryBubble?: boolean
  /** Dark image overlay (time chip on photo) */
  variant?: "default" | "overlay"
}

/**
 * WhatsApp-style: sending → double ✓ delivered (gray) → double ✓ read (blue).
 */
export function MessageTicks({ status, onPrimaryBubble, variant = "default" }: MessageTicksProps) {
  if (status === "sending") {
    return (
      <Loader2
        className={cn(
          "h-3 w-3 animate-spin",
          variant === "overlay" ? "text-white/90" : "opacity-80"
        )}
        aria-label="Sending"
      />
    )
  }

  if (status === "sent") {
    return (
      <span className="inline-flex items-center" aria-label="Delivered">
        <CheckCheck
          className={cn(
            "h-3.5 w-3.5",
          variant === "overlay"
            ? "text-white/80"
            : onPrimaryBubble
              ? "text-primary-foreground/70"
              : "text-muted-foreground"
          )}
          strokeWidth={2.5}
        />
      </span>
    )
  }

  return (
    <span className="inline-flex items-center" aria-label="Read">
      <CheckCheck
        className={cn(
          "h-3.5 w-3.5",
          variant === "overlay"
            ? "text-sky-300"
            : onPrimaryBubble
              ? "text-primary-foreground"
              : "text-primary"
        )}
        strokeWidth={2.5}
      />
    </span>
  )
}

/** Compact time like WhatsApp (e.g. 2:34 pm) */
export function messageTimeLabel(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
}
