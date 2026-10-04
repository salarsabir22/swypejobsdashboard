"use client"

import { useEffect, useMemo } from "react"
import { X } from "lucide-react"
import { classifyChatFile, formatFileSize, fileExtension } from "@/lib/chat/attachments"
import { Button } from "@/components/ui/button"

export function ChatAttachPreview({
  files,
  onRemove,
  onClear,
}: {
  files: File[]
  onRemove: (index: number) => void
  onClear: () => void
}) {
  const key = files.map((f) => `${f.name}:${f.size}:${f.lastModified}`).join("|")
  const urls = useMemo(() => files.map((file) => URL.createObjectURL(file)), [key, files])

  useEffect(() => {
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [urls])

  if (files.length === 0) return null

  return (
    <div className="mb-2 rounded-2xl border border-border bg-card/90 px-2.5 py-2 shadow-sm">
      <div className="mb-1.5 flex items-center justify-between gap-2 px-0.5">
        <p className="font-body text-[12px] font-medium text-muted-foreground">
          {files.length === 1 ? files[0].name : `${files.length} attachments`}
        </p>
        <button
          type="button"
          onClick={onClear}
          className="text-[12px] font-medium text-muted-foreground hover:text-foreground"
        >
          Clear
        </button>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-0.5">
        {files.map((file, index) => {
          const type = classifyChatFile(file)
          const url = urls[index]
          return (
            <div key={`${file.name}-${index}`} className="relative h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-xl bg-muted">
              {type === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt="" className="h-full w-full object-cover" />
              ) : type === "video" ? (
                <video src={url} muted className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center px-1 text-center">
                  <span className="text-[10px] font-semibold tracking-wide text-primary">{fileExtension(file.name)}</span>
                  <span className="mt-0.5 line-clamp-2 text-[9px] text-muted-foreground">{formatFileSize(file.size)}</span>
                </div>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0.5 top-0.5 h-6 w-6 rounded-full bg-black/55 text-white hover:bg-black/70 hover:text-white"
                onClick={() => onRemove(index)}
                aria-label={`Remove ${file.name}`}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
