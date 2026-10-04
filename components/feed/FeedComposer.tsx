"use client"

import { useState, type DragEvent, type RefObject } from "react"
import { ImagePlus, Loader2, Video, X } from "lucide-react"
import { FEED_MEDIA_ACCEPT, feedMediaKind, type FeedMediaKind } from "@/lib/feed/media"
import { cn, getInitials } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import type { FeedCurrentUser } from "./types"

export function FeedComposer({
  currentUser,
  body,
  onBodyChange,
  mediaPreview,
  mediaKind,
  posting,
  fileRef,
  onPickFile,
  onClearMedia,
  onPublish,
}: {
  currentUser: FeedCurrentUser
  body: string
  onBodyChange: (value: string) => void
  mediaPreview: string | null
  mediaKind: FeedMediaKind | null
  posting: boolean
  fileRef: RefObject<HTMLInputElement | null>
  onPickFile: (file: File | null) => void
  onClearMedia: () => void
  onPublish: () => void
}) {
  const [open, setOpen] = useState(false)
  const [dragging, setDragging] = useState(false)
  const expanded = open || Boolean(body.trim()) || Boolean(mediaPreview)
  const placeholder =
    currentUser.role === "recruiter"
      ? "Share a role, hiring note, or campus update"
      : "Share a project, question, or campus update"
  const canPost = Boolean(body.trim() || mediaPreview) && !posting
  const kind = mediaKind || feedMediaKind(mediaPreview)

  const takeDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) onPickFile(file)
  }

  const openPicker = () => {
    setOpen(true)
    fileRef.current?.click()
  }

  return (
    <Card
      className={cn("overflow-hidden", dragging && "ring-2 ring-primary")}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={takeDrop}
    >
      <CardContent className="p-4">
        <input
          ref={fileRef}
          type="file"
          accept={FEED_MEDIA_ACCEPT}
          className="sr-only"
          onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
        />
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12 shrink-0">
            <AvatarImage src={currentUser.avatarUrl || undefined} alt="" />
            <AvatarFallback>{getInitials(currentUser.fullName)}</AvatarFallback>
          </Avatar>
          {expanded ? (
            <div className="min-w-0 flex-1 space-y-3">
              <Textarea
                value={body}
                onChange={(e) => onBodyChange(e.target.value)}
                onPaste={(e) => {
                  const file = e.clipboardData.files?.[0]
                  if (file) {
                    e.preventDefault()
                    onPickFile(file)
                  }
                }}
                placeholder={placeholder}
                className="min-h-[108px] resize-none rounded-xl border-0 bg-muted/40 px-3 py-3 shadow-none focus-visible:ring-1"
                maxLength={3000}
                aria-label="Write a post"
                autoFocus
              />
              {mediaPreview ? (
                <div className="relative overflow-hidden rounded-xl border border-border bg-black">
                  {kind === "video" ? (
                    <video src={mediaPreview} controls playsInline className="max-h-72 w-full object-contain" />
                  ) : (
                    <img src={mediaPreview} alt="" className="max-h-72 w-full object-cover" />
                  )}
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    className="absolute right-2 top-2 h-8 w-8 rounded-full"
                    onClick={onClearMedia}
                    aria-label={kind === "video" ? "Remove video" : "Remove photo"}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : null}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="rounded-full text-muted-foreground"
                    onClick={openPicker}
                  >
                    <ImagePlus className="h-4 w-4 text-emerald-600" />
                    Photo
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="rounded-full text-muted-foreground"
                    onClick={openPicker}
                  >
                    <Video className="h-4 w-4 text-rose-600" />
                    Video
                  </Button>
                  <span className="font-data text-[11px] text-muted-foreground">{body.trim().length}/3000</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="rounded-full"
                    disabled={posting}
                    onClick={() => {
                      onBodyChange("")
                      onClearMedia()
                      setOpen(false)
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="button" className="rounded-full px-5" disabled={!canPost} onClick={() => void onPublish()}>
                    {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post"}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => setOpen(true)}
                className={cn(
                  "flex h-12 w-full items-center rounded-full border border-border bg-card px-4 text-left font-body text-sm text-muted-foreground transition-colors",
                  "hover:bg-muted/50"
                )}
              >
                Start a post
              </button>
              <div className="mt-1 flex">
                <Button type="button" variant="ghost" size="sm" className="rounded-full text-muted-foreground" onClick={openPicker}>
                  <ImagePlus className="h-4 w-4 text-emerald-600" />
                  Photo
                </Button>
                <Button type="button" variant="ghost" size="sm" className="rounded-full text-muted-foreground" onClick={openPicker}>
                  <Video className="h-4 w-4 text-rose-600" />
                  Video
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
