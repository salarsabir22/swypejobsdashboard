"use client"

import { cn } from "@/lib/utils"
import { feedMediaKind, type FeedMediaKind } from "@/lib/feed/media"

export function FeedMedia({
  url,
  mediaType,
  className,
  maxClassName = "max-h-[32rem]",
  onOpenImage,
}: {
  url: string
  mediaType?: string | null
  className?: string
  maxClassName?: string
  onOpenImage?: () => void
}) {
  const kind: FeedMediaKind = feedMediaKind(url, mediaType) || "image"

  if (kind === "video") {
    return (
      <video
        src={url}
        controls
        playsInline
        preload="metadata"
        className={cn("w-full bg-black object-contain", maxClassName, className)}
      />
    )
  }

  const img = (
    <img src={url} alt="" className={cn("w-full bg-muted object-cover", maxClassName, className)} />
  )

  if (!onOpenImage) return img

  return (
    <button type="button" className="block w-full" onClick={onOpenImage} aria-label="View photo">
      {img}
    </button>
  )
}
