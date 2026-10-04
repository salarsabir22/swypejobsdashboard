"use client"

import { useEffect, useRef } from "react"
import { Camera, FileText, Headphones, Images } from "lucide-react"
import { AUDIO_ACCEPT, CAMERA_ACCEPT, DOCUMENT_ACCEPT, GALLERY_ACCEPT } from "@/lib/chat/attachments"
import { cn } from "@/lib/utils"

type AttachKind = "document" | "camera" | "gallery" | "audio"

const OPTIONS: { kind: AttachKind; label: string; accept: string; capture?: boolean; multiple?: boolean; icon: typeof FileText; tone: string }[] = [
  { kind: "document", label: "Document", accept: DOCUMENT_ACCEPT, multiple: true, icon: FileText, tone: "bg-[#7c5cbf]" },
  { kind: "camera", label: "Camera", accept: CAMERA_ACCEPT, capture: true, icon: Camera, tone: "bg-[#e05c8a]" },
  { kind: "gallery", label: "Gallery", accept: GALLERY_ACCEPT, multiple: true, icon: Images, tone: "bg-[#3d8fd1]" },
  { kind: "audio", label: "Audio", accept: AUDIO_ACCEPT, multiple: true, icon: Headphones, tone: "bg-[#f5a524]" },
]

export function ChatAttachTray({
  open,
  onClose,
  onFiles,
}: {
  open: boolean
  onClose: () => void
  onFiles: (files: File[]) => void
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const inputs = useRef<Record<AttachKind, HTMLInputElement | null>>({
    document: null,
    camera: null,
    gallery: null,
    audio: null,
  })

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("mousedown", onDoc)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDoc)
      document.removeEventListener("keydown", onKey)
    }
  }, [open, onClose])

  return (
    <div ref={rootRef} className="absolute bottom-[calc(100%+10px)] left-1 z-30">
      {open ? (
      <div className="rounded-2xl border border-border bg-card/95 p-3 shadow-[0_18px_50px_rgba(10,22,40,0.18)] backdrop-blur-xl">
        <div className="grid grid-cols-4 gap-3 px-1 pb-0.5 pt-0.5">
          {OPTIONS.map((opt) => {
            const Icon = opt.icon
            return (
              <button
                key={opt.kind}
                type="button"
                className="flex w-[4.35rem] flex-col items-center gap-1.5"
                onClick={() => inputs.current[opt.kind]?.click()}
              >
                <span className={cn("flex h-12 w-12 items-center justify-center rounded-full text-white shadow-sm", opt.tone)}>
                  <Icon className="h-5 w-5" strokeWidth={1.85} />
                </span>
                <span className="text-[11px] font-medium tracking-[-0.01em] text-muted-foreground">{opt.label}</span>
              </button>
            )
          })}
        </div>
      </div>
      ) : null}
      {OPTIONS.map((opt) => (
        <input
          key={opt.kind}
          ref={(el) => {
            inputs.current[opt.kind] = el
          }}
          type="file"
          className="sr-only"
          accept={opt.accept}
          multiple={opt.multiple}
          capture={opt.capture ? "environment" : undefined}
          onChange={(e) => {
            const files = Array.from(e.target.files ?? [])
            e.target.value = ""
            if (files.length) onFiles(files)
          }}
        />
      ))}
    </div>
  )
}
