"use client"

import { useEffect } from "react"

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  const tag = target.tagName
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT"
}

export function useDiscoverKeys(opts: {
  enabled: boolean
  onPass: () => void
  onApply: () => void
  onSave?: () => void
  onUndo: () => void
}) {
  const { enabled, onPass, onApply, onSave, onUndo } = opts

  useEffect(() => {
    if (!enabled) return

    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return
      if (isTypingTarget(e.target)) return

      if (e.key === "ArrowLeft" || e.key === "x" || e.key === "X") {
        e.preventDefault()
        onPass()
        return
      }
      if (e.key === "ArrowRight") {
        e.preventDefault()
        onApply()
        return
      }
      if (onSave && (e.key === "ArrowUp" || e.key === "s" || e.key === "S")) {
        e.preventDefault()
        onSave()
        return
      }
      if (e.key === "z" || e.key === "Z" || e.key === "Backspace") {
        e.preventDefault()
        onUndo()
      }
    }

    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [enabled, onPass, onApply, onSave, onUndo])
}
