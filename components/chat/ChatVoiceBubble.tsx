"use client"

import { useMemo, useRef, useState, type ReactNode } from "react"
import { Mic, Pause, Play } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatVoiceClock } from "@/components/chat/use-voice-recorder"
import { useSignedStorageUrl } from "@/components/storage/use-signed-storage-url"

const BAR_COUNT = 40

function barsFromSeed(seed: string) {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619)
  return Array.from({ length: BAR_COUNT }, (_, i) => {
    h = Math.imul(h ^ (h >>> 13), 1274126177)
    const n = ((h >>> 0) % 1000) / 1000
    const env = 0.28 + 0.72 * Math.sin((i / (BAR_COUNT - 1)) * Math.PI)
    return 0.16 + n * 0.84 * env
  })
}

export function ChatVoiceBubble({
  src,
  durationSeconds,
  own,
  timeLabel,
  ticks,
}: {
  src: string
  durationSeconds: number
  own?: boolean
  timeLabel?: string
  ticks?: ReactNode
}) {
  const resolvedSrc = useSignedStorageUrl("chat-media", src)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [current, setCurrent] = useState(0)
  const bars = useMemo(() => barsFromSeed(src), [src])

  const toggle = async () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
      setPlaying(false)
      return
    }
    try {
      await audio.play()
      setPlaying(true)
    } catch {
      setPlaying(false)
    }
  }

  const seek = (ratio: number) => {
    const audio = audioRef.current
    if (!audio) return
    const dur = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : durationSeconds || 1
    audio.currentTime = Math.max(0, Math.min(dur, ratio * dur))
  }

  const shown = playing || current > 0.15 ? current : durationSeconds

  return (
    <div className={cn("flex w-[min(72vw,17.5rem)] items-center gap-2", own ? "text-primary-foreground" : "text-foreground")}>
      <audio
        ref={audioRef}
        src={resolvedSrc ?? undefined}
        preload="metadata"
        onTimeUpdate={(e) => {
          const audio = e.currentTarget
          const dur = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : durationSeconds || 1
          setCurrent(audio.currentTime)
          setProgress(Math.min(1, audio.currentTime / dur))
        }}
        onEnded={() => {
          setPlaying(false)
          setProgress(0)
          setCurrent(0)
        }}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
      />
      <button
        type="button"
        onClick={() => void toggle()}
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
          own ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary text-primary-foreground"
        )}
        aria-label={playing ? "Pause voice message" : "Play voice message"}
      >
        {playing ? (
          <Pause className="h-4 w-4 fill-current" />
        ) : (
          <Play className="ml-0.5 h-4 w-4 fill-current" />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <button
          type="button"
          className="flex h-8 w-full items-center gap-px"
          aria-label="Seek voice message"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            seek((e.clientX - rect.left) / rect.width)
          }}
        >
          {bars.map((h, i) => {
            const played = i / bars.length <= progress
            return (
              <span
                key={i}
                className={cn(
                  "jm-voice-bar",
                  own
                    ? played
                      ? "bg-primary-foreground"
                      : "bg-primary-foreground/30"
                    : played
                      ? "bg-primary"
                      : "bg-muted-foreground/35"
                )}
                style={{ height: `${Math.round(h * 100)}%` }}
              />
            )
          })}
        </button>
        <div className="mt-0.5 flex items-center justify-between gap-2">
          <span className={cn("font-data text-[11px] tabular-nums", own ? "text-primary-foreground/70" : "text-muted-foreground")}>
            {formatVoiceClock(shown)}
          </span>
          <span className={cn("inline-flex items-center gap-1", own ? "text-primary-foreground/70" : "text-muted-foreground")}>
            <Mic className="h-3 w-3" />
            {timeLabel ? <span className="font-data text-[10px] tabular-nums">{timeLabel}</span> : null}
            {ticks}
          </span>
        </div>
      </div>
    </div>
  )
}
