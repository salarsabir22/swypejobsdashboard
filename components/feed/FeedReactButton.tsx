"use client"

import { useEffect, useRef, useState } from "react"
import { ThumbsUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { FEED_REACTIONS, reactionMeta, type FeedReactionId } from "@/lib/feed/reactions"

export function FeedReactButton({
  current,
  onReact,
}: {
  current: FeedReactionId | null
  onReact: (reaction: FeedReactionId | null) => void
}) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const holdOpened = useRef(false)
  const meta = current ? reactionMeta(current) : null

  const clearTimers = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
    if (holdTimer.current) clearTimeout(holdTimer.current)
  }

  useEffect(() => () => clearTimers(), [])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [open])

  return (
    <div
      ref={wrapRef}
      className="relative"
      onPointerEnter={() => {
        hoverTimer.current = setTimeout(() => setOpen(true), 280)
      }}
      onPointerLeave={() => {
        clearTimers()
        setOpen(false)
      }}
    >
      {open ? (
        <div className="absolute bottom-[calc(100%+6px)] left-2 z-20 rounded-full border border-border bg-card px-1.5 py-1 shadow-[0_12px_32px_rgba(10,22,40,0.16)] sm:left-1/2 sm:-translate-x-1/2">
          <div className="flex items-end gap-0.5">
            {FEED_REACTIONS.map((item) => (
              <button
                key={item.id}
                type="button"
                title={item.label}
                className="flex h-10 w-10 items-center justify-center rounded-full text-[22px] leading-none transition-transform hover:-translate-y-1 hover:scale-125"
                onClick={() => {
                  onReact(item.id)
                  setOpen(false)
                }}
              >
                <span aria-hidden>{item.emoji}</span>
                <span className="sr-only">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        className={cn("h-11 w-full rounded-none px-1 font-heading text-xs sm:px-3 sm:text-sm", meta?.className)}
        onClick={() => {
          if (holdOpened.current) {
            holdOpened.current = false
            return
          }
          onReact(current ? null : "like")
        }}
        onPointerDown={() => {
          holdTimer.current = setTimeout(() => {
            holdOpened.current = true
            setOpen(true)
          }, 420)
        }}
        onPointerUp={clearTimers}
        onContextMenu={(e) => {
          e.preventDefault()
          setOpen(true)
        }}
      >
        {meta ? (
          <span className="text-base leading-none" aria-hidden>
            {meta.emoji}
          </span>
        ) : (
          <ThumbsUp className="h-4 w-4" />
        )}
        {meta ? meta.label : "Like"}
      </Button>
    </div>
  )
}
