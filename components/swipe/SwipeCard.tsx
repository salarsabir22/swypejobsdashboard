"use client"

import { useRef, useCallback } from "react"

import { cn } from "@/lib/utils"

interface SwipeCardProps {
  onSwipeLeft:  () => void
  onSwipeRight: () => void
  children:     React.ReactNode
  disabled?:    boolean
  /** Shown when dragging right (e.g. "Apply" for jobs, "Like" for candidates) */
  rightStampLabel?: string
  leftStampLabel?: string
  className?: string
}

// How far (px) the card must travel to trigger a swipe
const DISTANCE_THRESHOLD = 80
// How fast (px/ms) a flick must be to trigger a swipe regardless of distance
const VELOCITY_THRESHOLD = 0.45

export function SwipeCard({
  onSwipeLeft,
  onSwipeRight,
  children,
  disabled,
  rightStampLabel = "Apply",
  leftStampLabel = "Pass",
  className,
}: SwipeCardProps) {
  const cardRef  = useRef<HTMLDivElement>(null)
  const likeRef  = useRef<HTMLDivElement>(null)
  const nopeRef  = useRef<HTMLDivElement>(null)

  // All drag state lives in a ref - zero re-renders during drag
  const drag = useRef({
    active:   false,
    leaving:  false,
    startX:   0,
    startY:   0,
    x:        0,
    y:        0,
    lastX:    0,
    lastT:    0,
    velocityX: 0,
  })

  // Simple swipe sound (no external audio files needed).
  const playSwipeSound = useCallback((direction: "left" | "right") => {
    try {
      const AudioCtx =
        window.AudioContext ??
        (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const now = ctx.currentTime

      // Right swipe = slightly higher pitch, left swipe = lower pitch.
      const baseFreq = direction === "right" ? 740 : 520
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = "triangle"
      osc.frequency.setValueAtTime(baseFreq, now)
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.15, now + 0.08)

      gain.gain.setValueAtTime(0.0001, now)
      gain.gain.exponentialRampToValueAtTime(0.18, now + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.16)

      // Cleanup context after playback.
      setTimeout(() => { ctx.close().catch(() => {}) }, 220)
    } catch {
      // No-op: sound is optional and should never break swipe UX.
    }
  }, [])

  /* ── update card visuals directly on the DOM ────────────────── */
  const applyTransform = (x: number, y: number) => {
    const card = cardRef.current
    const like = likeRef.current
    const nope = nopeRef.current
    if (!card) return

    const rot = Math.min(Math.max(x / 18, -22), 22)
    card.style.transform = `translateX(${x}px) translateY(${y * 0.12}px) rotate(${rot}deg)`

    const progress = Math.abs(x) / DISTANCE_THRESHOLD
    if (like) like.style.opacity = x > 0 ? String(Math.min(progress, 1)) : "0"
    if (nope) nope.style.opacity = x < 0 ? String(Math.min(progress, 1)) : "0"
  }

  /* ── fly the card off screen, then call the callback ────────── */
  const flyOff = useCallback((direction: "left" | "right") => {
    const card = cardRef.current
    if (!card || drag.current.leaving) return
    drag.current.leaving = true

    card.style.transition = "transform 0.38s cubic-bezier(0.55, 0, 0.85, 0.15)"
    card.style.transform   =
      direction === "right"
        ? "translateX(140vw) rotate(28deg)"
        : "translateX(-140vw) rotate(-28deg)"

    setTimeout(() => {
      drag.current.leaving = false
      playSwipeSound(direction)
      if (direction === "right") onSwipeRight()
      else onSwipeLeft()
    }, 380)
  }, [onSwipeLeft, onSwipeRight, playSwipeSound])

  /* ── spring back to centre ──────────────────────────────────── */
  const snapBack = () => {
    const card = cardRef.current
    const like = likeRef.current
    const nope = nopeRef.current
    if (!card) return

    card.style.transition = "transform 0.42s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
    card.style.transform  = "translateX(0px) translateY(0px) rotate(0deg)"
    if (like) like.style.opacity = "0"
    if (nope) nope.style.opacity = "0"

    setTimeout(() => { if (card) card.style.transition = "none" }, 420)
  }

  /* ── pointer handlers ───────────────────────────────────────── */
  const onDown = useCallback((e: React.PointerEvent) => {
    if (disabled || drag.current.leaving) return
    const card = cardRef.current
    if (!card) return

    card.style.transition = "none"
    card.setPointerCapture(e.pointerId)

    drag.current = {
      ...drag.current,
      active:    true,
      startX:    e.clientX,
      startY:    e.clientY,
      x:         0,
      y:         0,
      lastX:     e.clientX,
      lastT:     e.timeStamp,
      velocityX: 0,
    }
  }, [disabled])

  const onMove = useCallback((e: React.PointerEvent) => {
    const d = drag.current
    if (!d.active || d.leaving) return

    const x = e.clientX - d.startX
    const y = e.clientY - d.startY

    // rolling velocity (px / ms)
    const dt = e.timeStamp - d.lastT
    if (dt > 0) d.velocityX = (e.clientX - d.lastX) / dt
    d.lastX = e.clientX
    d.lastT = e.timeStamp
    d.x = x
    d.y = y

    applyTransform(x, y)
  }, [])

  const onUp = useCallback(() => {
    const d = drag.current
    if (!d.active) return
    d.active = false

    const farRight = d.x >  DISTANCE_THRESHOLD || d.velocityX >  VELOCITY_THRESHOLD
    const farLeft  = d.x < -DISTANCE_THRESHOLD || d.velocityX < -VELOCITY_THRESHOLD

    if (farRight)     flyOff("right")
    else if (farLeft) flyOff("left")
    else              snapBack()
  }, [flyOff])

  return (
    <div
      ref={cardRef}
      style={{
        touchAction: "none",
        willChange:  "transform",
        userSelect:  "none",
      }}
      className={cn("relative min-h-0 cursor-grab overflow-hidden active:cursor-grabbing max-lg:h-full", className)}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      {/* Apply overlay */}
      <div
        ref={likeRef}
        style={{ opacity: 0 }}
        className="absolute top-5 left-4 z-20 pointer-events-none"
      >
        <div className="border-2 border-white/90 text-white font-heading text-sm font-semibold px-3 py-1 rounded-lg -rotate-[18deg] tracking-wide bg-primary/40 backdrop-blur-sm">
          {rightStampLabel}
        </div>
      </div>

      {/* Pass overlay */}
      <div
        ref={nopeRef}
        style={{ opacity: 0 }}
        className="absolute top-5 right-4 z-20 pointer-events-none"
      >
        <div className="border-2 border-neutral-400 text-neutral-200 font-heading text-sm font-semibold px-3 py-1 rounded-lg rotate-[18deg] tracking-wide bg-neutral-900/50 backdrop-blur-sm">
          {leftStampLabel}
        </div>
      </div>

      {children}
    </div>
  )
}

export function useSwipeControls(onLeft: () => void, onRight: () => void) {
  return {
    triggerLeft:  useCallback(() => onLeft(),  [onLeft]),
    triggerRight: useCallback(() => onRight(), [onRight]),
  }
}
