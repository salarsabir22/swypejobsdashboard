import { cn } from "@/lib/utils"

/**
 * swypejobs wordmark. Uses `.lp-logo-font` (Outfit) — Bagoss Condensed is not bundled.
 */
export function Logo({
  size = 32,
  tone = "dark",
  className,
}: {
  size?: number
  tone?: "dark" | "light"
  className?: string
}) {
  return (
    <span
      className={cn(
        "lp-logo-font inline-block font-bold tracking-[-0.03em]",
        tone === "light" ? "text-white" : "text-foreground",
        className
      )}
      style={{ fontSize: Math.round(size * 0.85), lineHeight: 1 }}
    >
      swypejobs<span className={tone === "light" ? "text-[var(--lp-mint)]" : "text-primary"}>.</span>
    </span>
  )
}
