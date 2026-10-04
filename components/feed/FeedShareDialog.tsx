"use client"

import { useState } from "react"
import { Repeat2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { formatRelativeTime, getInitials } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { FeedMedia } from "./FeedMedia"
import { one, type PostRow } from "./types"

export function FeedShareDialog({
  open,
  onOpenChange,
  post,
  headline,
  sharing,
  onShareToFeed,
  onCopyLink,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  post: PostRow
  headline: string
  sharing: boolean
  onShareToFeed: (commentary: string) => void | Promise<void | boolean>
  onCopyLink: () => void
}) {
  const [commentary, setCommentary] = useState("")
  const author = one(post.profiles)
  const name = author?.full_name || "Member"
  const original = post.shared_post_id ? one(post.shared) ?? post : post
  const originalAuthor = post.shared_post_id ? one(one(post.shared)?.profiles) : author
  const preview = post.shared_post_id ? original : post
  const previewAuthor = originalAuthor || author
  const previewName = previewAuthor?.full_name || name

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setCommentary("")
        onOpenChange(next)
      }}
    >
      <DialogContent className="max-w-lg gap-4">
        <DialogHeader>
          <DialogTitle>Share this post</DialogTitle>
          <DialogDescription>Add a note and put it on your feed, or copy the link.</DialogDescription>
        </DialogHeader>
        <Textarea
          value={commentary}
          onChange={(e) => setCommentary(e.target.value)}
          placeholder="Say something about this…"
          maxLength={3000}
          rows={3}
          className="resize-none"
        />
        <div className="overflow-hidden rounded-xl border border-border">
          <div className="flex items-center gap-2.5 px-3 py-2.5">
            <Avatar className="h-8 w-8">
              <AvatarImage src={previewAuthor?.avatar_url || undefined} alt="" />
              <AvatarFallback className="text-[10px]">{getInitials(previewName)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate font-heading text-sm font-semibold">{previewName}</p>
              <p className="truncate font-body text-[11px] text-muted-foreground">
                {headline}
                <span aria-hidden> · </span>
                {formatRelativeTime(preview.created_at)}
              </p>
            </div>
          </div>
          {preview.body.trim() ? (
            <p className="line-clamp-4 whitespace-pre-wrap px-3 pb-3 font-body text-sm leading-relaxed">{preview.body}</p>
          ) : null}
          {preview.image_url ? (
            <FeedMedia url={preview.image_url} mediaType={preview.media_type} maxClassName="max-h-40" />
          ) : null}
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onCopyLink}>
            Copy link
          </Button>
          <Button
            type="button"
            disabled={sharing}
            onClick={async () => {
              const ok = await onShareToFeed(commentary.trim())
              if (ok !== false) {
                setCommentary("")
                onOpenChange(false)
              }
            }}
          >
            <Repeat2 className="h-4 w-4" />
            {sharing ? "Sharing…" : "Share to feed"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
