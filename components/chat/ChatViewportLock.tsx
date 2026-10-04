"use client"

import { useEffect, type ReactNode } from "react"

export function ChatViewportLock({ children }: { children: ReactNode }) {
  useEffect(() => {
    const main = document.querySelector("main")
    const previousOverflow = main?.style.overflow ?? ""
    const previousBody = document.body.style.overflow
    if (main) main.style.overflow = "hidden"
    document.body.style.overflow = "hidden"
    return () => {
      if (main) main.style.overflow = previousOverflow
      document.body.style.overflow = previousBody
    }
  }, [])

  return <>{children}</>
}
