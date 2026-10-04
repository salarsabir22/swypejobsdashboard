"use client"

import { ArrowUp, Mic, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { formatVoiceClock, MAX_VOICE_SECONDS } from "@/components/chat/use-voice-recorder"

export function ChatVoiceRecordBar({
  elapsed,
  slideCancel,
  locked,
  onCancel,
  onSend,
}: {
  elapsed: number
  slideCancel: boolean
  locked: boolean
  onCancel: () => void
  onSend: () => void
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full px-1.5 py-1.5 shadow-[0_10px_28px_rgba(0,0,0,0.28)]",
        slideCancel ? "border border-destructive/40 bg-destructive/10" : "border border-border bg-card"
      )}
    >
      {locked ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-11 w-11 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={onCancel}
          aria-label="Delete recording"
        >
          <Trash2 className="h-5 w-5" />
        </Button>
      ) : (
        <span className="flex h-11 w-11 items-center justify-center">
          <span className="size-2.5 animate-pulse rounded-full bg-destructive" />
        </span>
      )}

      <span className="w-10 shrink-0 font-data text-[13px] tabular-nums text-destructive">
        {formatVoiceClock(elapsed)}
      </span>

      <div className="jm-voice-live min-w-0 flex-1" aria-hidden>
        {Array.from({ length: 22 }).map((_, i) => (
          <span key={i} className="jm-voice-live__bar" style={{ animationDelay: `${(i % 7) * 80}ms` }} />
        ))}
      </div>

      {!locked ? (
        <p
          className={cn(
            "hidden shrink-0 font-body text-[13px] sm:block",
            slideCancel ? "font-medium text-destructive" : "text-muted-foreground"
          )}
        >
          {slideCancel ? "Release to cancel" : "‹ Slide to cancel"}
        </p>
      ) : null}

      {locked ? (
        <Button
          type="button"
          size="icon"
          className="h-12 w-12 rounded-full"
          onClick={onSend}
          aria-label="Send voice message"
        >
          <ArrowUp className="h-5 w-5" strokeWidth={2.4} />
        </Button>
      ) : (
        <span
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-full",
            slideCancel ? "bg-destructive text-primary-foreground" : "bg-primary text-primary-foreground"
          )}
        >
          <Mic className="h-5 w-5" />
        </span>
      )}
      <span className="sr-only">
        Recording, {formatVoiceClock(elapsed)} of {formatVoiceClock(MAX_VOICE_SECONDS)}
      </span>
    </div>
  )
}
