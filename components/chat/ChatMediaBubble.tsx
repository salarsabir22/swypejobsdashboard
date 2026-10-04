"use client"

import { useState, type ReactNode } from "react"
import { Download, FileText, Headphones, X } from "lucide-react"
import { formatFileSize, fileExtension, isGenericMediaCaption } from "@/lib/chat/attachments"
import { useSignedStorageUrl } from "@/components/storage/use-signed-storage-url"
import { cn } from "@/lib/utils"

type MediaKind = "image" | "video" | "file" | "audio"

export function ChatMediaBubble({
  type,
  src,
  name,
  caption,
  fileName,
  fileSize,
  mimeType,
  own,
  timeLabel,
  ticks,
}: {
  type: MediaKind
  src: string
  name?: string | null
  caption?: string | null
  fileName?: string | null
  fileSize?: number | null
  mimeType?: string | null
  own: boolean
  timeLabel: string
  ticks?: ReactNode
}) {
  const resolvedSrc = useSignedStorageUrl("chat-media", src)
  const [lightbox, setLightbox] = useState(false)
  const title = fileName || name || "File"
  const shownCaption = isGenericMediaCaption(caption, type, title) ? "" : caption?.trim() || ""

  return (
    <div className="min-w-[9rem] max-w-[16.5rem]">
      {type === "image" ? (
        <button
          type="button"
          onClick={() => setLightbox(true)}
          className="block w-full overflow-hidden rounded-xl bg-black/10"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={resolvedSrc ?? undefined} alt={shownCaption || "Photo"} className="max-h-72 w-full object-cover" />
        </button>
      ) : type === "video" ? (
        <video
          src={resolvedSrc ?? undefined}
          controls
          playsInline
          preload="metadata"
          className="max-h-72 w-full rounded-xl bg-black"
        />
      ) : type === "audio" ? (
        <AudioChip src={resolvedSrc} title={title} own={own} />
      ) : (
        <a
          href={resolvedSrc ?? undefined}
          target="_blank"
          rel="noopener noreferrer"
          download={title}
          className={cn(
            "flex items-center gap-2.5 rounded-xl px-2.5 py-2.5",
            own ? "bg-black/10" : "bg-black/[0.04]"
          )}
        >
          <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", own ? "bg-white/15" : "bg-primary/10")}>
            <FileText className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium leading-tight">{title}</span>
            <span className={cn("mt-0.5 block text-[11px]", own ? "text-primary-foreground/70" : "text-muted-foreground")}>
              {[fileExtension(title), formatFileSize(fileSize), mimeType?.split("/")[1]?.toUpperCase()]
                .filter(Boolean)
                .slice(0, 2)
                .join(" · ")}
            </span>
          </span>
          <Download className="h-4 w-4 shrink-0 opacity-70" />
        </a>
      )}

      {shownCaption ? (
        <p className="whitespace-pre-wrap break-words px-0.5 pt-1.5 text-[14px] leading-snug">{shownCaption}</p>
      ) : null}

      <span
        className={cn(
          "mt-1 flex items-center justify-end gap-1 px-0.5 font-data text-[10px]",
          own ? "text-primary-foreground/70" : "text-muted-foreground"
        )}
      >
        {timeLabel}
        {ticks}
      </span>

      {lightbox ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/88 p-4"
          onClick={() => setLightbox(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Photo"
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            onClick={() => setLightbox(false)}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resolvedSrc ?? undefined}
            alt={shownCaption || "Photo"}
            className="max-h-full max-w-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </div>
  )
}

function AudioChip({ src, title, own }: { src: string | null; title: string; own: boolean }) {
  return (
    <div className={cn("rounded-xl px-2.5 py-2", own ? "bg-black/10" : "bg-black/[0.04]")}>
      <p className="mb-1.5 flex items-center gap-1.5 truncate text-[13px] font-medium">
        <Headphones className="h-3.5 w-3.5 shrink-0 opacity-70" />
        <span className="truncate">{title}</span>
      </p>
      <audio src={src ?? undefined} controls preload="metadata" className="h-8 w-full" />
    </div>
  )
}
