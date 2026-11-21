"use client"

import { useEffect } from "react"

const STORAGE_KEY = "opportunities.viewed"

/**
 * Fire-and-forget view receipt for the listings actually rendered for this
 * student. Session storage keeps it to one write per listing per tab.
 */
export function OpportunityViewTracker({ ids }: { ids: string[] }) {
  const signature = ids.join("|")

  useEffect(() => {
    const list = signature ? signature.split("|") : []
    if (!list.length) return

    let pending = list
    try {
      const store = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || "{}") as Record<string, boolean>
      pending = list.filter((id) => !store[id])
      if (!pending.length) return
      for (const id of pending) store[id] = true
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(store))
    } catch {
      pending = list
    }

    void fetch("/api/opportunities/views", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: pending }),
    }).catch(() => undefined)
  }, [signature])

  return null
}
