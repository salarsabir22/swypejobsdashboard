import { useEffect, useState } from "react"

export function useIsDesktop(query = "(min-width: 1024px)") {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(query)
    const update = () => setMatches(mq.matches)
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [query])

  return matches
}

export function formatPreviewTime(date?: string | Date | null) {
  if (!date) return ""
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return ""

  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
  }

  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday"

  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleDateString(undefined, { month: "numeric", day: "numeric" })
  }

  return d.toLocaleDateString(undefined, { month: "numeric", day: "numeric", year: "2-digit" })
}

export function formatDaySeparator(date: Date) {
  const time = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
  const now = new Date()

  if (date.toDateString() === now.toDateString()) return `Today ${time}`

  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) return `Yesterday ${time}`

  const day = date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
  return `${day} at ${time}`
}

export function shouldShowDaySeparator(current: string, previous?: string) {
  if (!previous) return true
  const a = new Date(current)
  const b = new Date(previous)
  return a.toDateString() !== b.toDateString()
}

export const ICEBREAKERS = [
  "Hi - thanks for matching. I’d love to learn more.",
  "Hey! Is this still open to chat about?",
  "Hello - happy to share more about my background.",
]
