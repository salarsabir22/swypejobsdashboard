"use client"

import { useEffect, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { LoaderCircle } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Campus filter navigation with an explicit pending flag.
 * useTransition can stick on soft-nav; we clear pending when the URL search params settle.
 */
export function useCampusFilterNav() {
  const pathname = usePathname()
  const router = useRouter()
  const params = useSearchParams()
  const [pending, setPending] = useState(false)
  const searchKey = params.toString()

  useEffect(() => {
    setPending(false)
  }, [pathname, searchKey])

  useEffect(() => {
    if (!pending) return
    const timer = window.setTimeout(() => setPending(false), 8000)
    return () => window.clearTimeout(timer)
  }, [pending])

  function navigate(href: string) {
    setPending(true)
    router.push(href)
  }

  function pushParams(next: URLSearchParams) {
    const href = next.toString() ? `${pathname}?${next.toString()}` : pathname
    navigate(href)
  }

  return { pending, pathname, params, navigate, pushParams }
}

export function CampusFilterPendingBadge({
  pending,
  className,
}: {
  pending: boolean
  className?: string
}) {
  if (!pending) return null
  return (
    <span
      role="status"
      aria-live="polite"
      aria-label="Updating"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[12px] font-medium text-muted-foreground",
        className
      )}
    >
      <LoaderCircle className="size-3.5 animate-spin" strokeWidth={2} aria-hidden />
      Updating…
    </span>
  )
}
