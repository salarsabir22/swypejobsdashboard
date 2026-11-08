"use client"

import { useEffect } from "react"
import { useSearchParams } from "next/navigation"

/** Scrolls to an element when `?focus=` matches `id`. */
export function FocusAnchor({ id }: { id: string }) {
  const params = useSearchParams()
  useEffect(() => {
    if (params.get("focus") !== id) return
    const node = document.getElementById(id)
    if (!node) return
    node.scrollIntoView({ behavior: "smooth", block: "start" })
    node.setAttribute("data-focused", "true")
  }, [params, id])
  return null
}
