"use client"

import { useState } from "react"
import Link from "next/link"
import {
  Briefcase,
  Globe2,
  GraduationCap,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Repeat2,
  Trash2,
} from "lucide-react"
import { profileSharePath } from "@/lib/share/profile-path"
import { isFeedReaction, reactionSummary, type FeedReactionId } from "@/lib/feed/reactions"
import { feedMediaKind } from "@/lib/feed/media"
import { cn, formatRelativeTime, getInitials } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Textarea } from "@/components/ui/textarea"
import { ReportBlockMenu } from "@/components/moderation/ReportBlockMenu"
import { FeedMedia } from "./FeedMedia"
import { FeedReactButton } from "./FeedReactButton"
import { FeedShareDialog } from "./FeedShareDialog"
import { one, wasEdited, type CommentRow, type FeedCurrentUser, type PostRow, type SharedOriginal } from "./types"

function PostBody({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)
  const long = text.length > 260 || text.split("\n").length > 4
  const parts = text.split(/(https?:\/\/[^\s<]+)/g)

  return (
    <div className="mt-3">
      <p
        className={cn(
          "whitespace-pre-wrap font-body text-[15px] leading-relaxed text-foreground",
          !expanded && long && "line-clamp-4"
        )}
      >
        {parts.map((part, i) =>
          /^https?:\/\//.test(part) ? (
            <a
              key={i}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all text-primary hover:underline"
            >
              {part}
            </a>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </p>
      {long ? (
        <button
          type="button"
          className="mt-1 font-body text-sm font-medium text-muted-foreground hover:text-foreground hover:underline"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "See less" : "See more"}
        </button>
      ) : null}
    </div>
  )
}

function NestedOriginal({ original, headline }: { original: SharedOriginal; headline: string }) {
  const author = one(original.profiles)
  const name = author?.full_name || "Member"
  const href = profileSharePath(author?.role, original.author_id)
  const body = original.body.trim()
  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-border">
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <Link href={href} className="shrink-0">
          <Avatar className="h-8 w-8">
            <AvatarImage src={author?.avatar_url || undefined} alt="" />
            <AvatarFallback className="text-[10px]">{getInitials(name)}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="min-w-0">
          <Link href={href} className="truncate font-heading text-sm font-semibold hover:underline">
            {name}
          </Link>
          <p className="truncate font-body text-[11px] text-muted-foreground">
            {headline}
            <span aria-hidden> · </span>
            {formatRelativeTime(original.created_at)}
          </p>
        </div>
      </div>
      {body ? <p className="line-clamp-5 whitespace-pre-wrap px-3 pb-3 font-body text-sm leading-relaxed">{body}</p> : null}
      {original.image_url ? (
        <FeedMedia url={original.image_url} mediaType={original.media_type} maxClassName="max-h-64" />
      ) : null}
    </div>
  )
}

function FeedComment({
  comment,
  currentUser,
  canModerate,
  onEdit,
  onDelete,
}: {
  comment: CommentRow
  currentUser: FeedCurrentUser
  canModerate: boolean
  onEdit: (body: string) => Promise<boolean>
  onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(comment.body)
  const [saving, setSaving] = useState(false)
  const commenter = one(comment.profiles)
  const commentName = commenter?.full_name || "Member"
  const commentHref = profileSharePath(commenter?.role, comment.author_id)
  const own = comment.author_id === currentUser.id
  const canAct = own || canModerate
  const trimmed = draft.trim()
  const canSave = trimmed.length > 0 && trimmed !== comment.body.trim()

  const save = async () => {
    if (!canSave || saving) return
    setSaving(true)
    const ok = await onEdit(trimmed)
    setSaving(false)
    if (ok) setEditing(false)
  }

  return (
    <div className="flex gap-2">
      <Link href={commentHref} className="shrink-0">
        <Avatar className="h-8 w-8">
          <AvatarImage src={commenter?.avatar_url || undefined} alt="" />
          <AvatarFallback className="text-[10px]">{getInitials(commentName)}</AvatarFallback>
        </Avatar>
      </Link>
      <div className="min-w-0 flex-1">
        <div className="rounded-2xl rounded-tl-md bg-muted/70 px-3 py-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link href={commentHref} className="truncate font-heading text-xs font-semibold hover:underline">
                {commentName}
              </Link>
              <span className="ml-2 shrink-0 font-body text-[10px] text-muted-foreground">
                {formatRelativeTime(comment.created_at)}
                {wasEdited(comment.created_at, comment.updated_at) ? " · Edited" : ""}
              </span>
            </div>
            {canAct && !editing ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 rounded-full text-muted-foreground"
                    aria-label="Comment actions"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  {own ? (
                    <DropdownMenuItem
                      onSelect={() => {
                        setDraft(comment.body)
                        setEditing(true)
                      }}
                    >
                      <Pencil />
                      Edit
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onSelect={() => {
                      if (window.confirm("Delete this comment?")) onDelete()
                    }}
                  >
                    <Trash2 />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
          {editing ? (
            <div className="mt-2 space-y-2">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={1000}
                rows={2}
                className="min-h-[64px] resize-y bg-card"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    void save()
                  }
                  if (e.key === "Escape") {
                    setDraft(comment.body)
                    setEditing(false)
                  }
                }}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 rounded-full px-3 text-xs"
                  disabled={saving}
                  onClick={() => {
                    setDraft(comment.body)
                    setEditing(false)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-7 rounded-full px-3 text-xs"
                  disabled={saving || !canSave}
                  onClick={() => void save()}
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
                </Button>
              </div>
            </div>
          ) : (
            <p className="font-body text-sm leading-relaxed">{comment.body}</p>
          )}
        </div>
      </div>
    </div>
  )
}

export function FeedPostCard({
  post,
  currentUser,
  headline,
  originalHeadline,
  commentsOpen,
  commentDraft,
  commentSending,
  shareCount,
  sharing,
  onToggleComments,
  onReact,
  onComment,
  onCommentDraftChange,
  onShareToFeed,
  onCopyLink,
  onDelete,
  onEdit,
  onEditComment,
  onDeleteComment,
  onBlocked,
}: {
  post: PostRow
  currentUser: FeedCurrentUser
  headline: string
  originalHeadline?: string
  commentsOpen: boolean
  commentDraft: string
  commentSending: boolean
  shareCount: number
  sharing: boolean
  onToggleComments: () => void
  onReact: (reaction: FeedReactionId | null) => void
  onComment: () => void
  onCommentDraftChange: (value: string) => void
  onShareToFeed: (commentary: string) => void | Promise<void | boolean>
  onCopyLink: () => void
  onDelete: () => void
  onEdit: (body: string) => Promise<boolean>
  onEditComment: (commentId: string, body: string) => Promise<boolean>
  onDeleteComment: (commentId: string) => void
  onBlocked: () => void
}) {
  const [lightbox, setLightbox] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [editingPost, setEditingPost] = useState(false)
  const [postDraft, setPostDraft] = useState(post.body)
  const [savingPost, setSavingPost] = useState(false)
  const author = one(post.profiles)
  const name = author?.full_name || "Member"
  const mine = (post.feed_post_likes || []).find((row) => row.user_id === currentUser.id)
  const myReaction = isFeedReaction(mine?.reaction) ? mine.reaction : mine ? "like" : null
  const { chips, total: reactionCount } = reactionSummary(post.feed_post_likes)
  const comments = [...(post.feed_post_comments || [])].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )
  const own = post.author_id === currentUser.id
  const href = profileSharePath(author?.role, post.author_id)
  const isRecruiter = author?.role === "recruiter"
  const body = post.body.trim()
  const original = one(post.shared)
  const canSaveEmpty = Boolean(post.image_url) || Boolean(post.shared_post_id)
  const trimmedPost = postDraft.trim()
  const postUnchanged = postDraft === post.body
  const canSavePost = !postUnchanged && (trimmedPost.length > 0 || canSaveEmpty)

  const savePost = async () => {
    if (!canSavePost || savingPost) return
    setSavingPost(true)
    const ok = await onEdit(trimmedPost)
    setSavingPost(false)
    if (ok) setEditingPost(false)
  }

  return (
    <Card className="overflow-hidden" id={`post-${post.id}`}>
      <div className="p-4 pb-3 sm:px-5">
        <div className="flex items-start gap-3">
          <Link href={href} className="shrink-0">
            <Avatar className="h-12 w-12">
              <AvatarImage src={author?.avatar_url || undefined} alt="" />
              <AvatarFallback>{getInitials(name)}</AvatarFallback>
            </Avatar>
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-1.5">
                  <Link href={href} className="truncate font-heading text-sm font-semibold hover:underline hover:text-primary">
                    {name}
                  </Link>
                  <span
                    className={cn(
                      "inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 font-data text-[10px] font-medium uppercase tracking-wide",
                      isRecruiter ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {isRecruiter ? <Briefcase className="h-2.5 w-2.5" /> : <GraduationCap className="h-2.5 w-2.5" />}
                    {isRecruiter ? "Hiring" : "Student"}
                  </span>
                </div>
                <p className="truncate font-body text-xs text-muted-foreground">{headline}</p>
                <p className="flex items-center gap-1 font-body text-[11px] text-muted-foreground">
                  <span>{formatRelativeTime(post.created_at)}</span>
                  {wasEdited(post.created_at, post.updated_at) ? (
                    <>
                      <span aria-hidden>·</span>
                      <span>Edited</span>
                    </>
                  ) : null}
                  <span aria-hidden>·</span>
                  {post.shared_post_id ? (
                    <>
                      <Repeat2 className="h-3 w-3" />
                      <span>Shared</span>
                      <span aria-hidden>·</span>
                    </>
                  ) : null}
                  <Globe2 className="h-3 w-3" />
                </p>
              </div>
              {own ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-full" aria-label="Post actions">
                      <MoreHorizontal className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem
                      onSelect={() => {
                        setPostDraft(post.body)
                        setEditingPost(true)
                      }}
                    >
                      <Pencil />
                      Edit post
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onSelect={() => {
                        if (window.confirm("Delete this post? This can’t be undone.")) onDelete()
                      }}
                    >
                      <Trash2 />
                      Delete post
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <ReportBlockMenu
                  currentUserId={currentUser.id}
                  peerId={post.author_id}
                  peerName={name}
                  onBlocked={onBlocked}
                />
              )}
            </div>
            {editingPost ? (
              <div className="mt-3 space-y-2">
                <Textarea
                  value={postDraft}
                  onChange={(e) => setPostDraft(e.target.value)}
                  maxLength={3000}
                  rows={4}
                  className="min-h-[96px] resize-y"
                  placeholder={canSaveEmpty ? "Add a caption…" : "What’s on your mind?"}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="rounded-full"
                    disabled={savingPost}
                    onClick={() => {
                      setPostDraft(post.body)
                      setEditingPost(false)
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="rounded-full"
                    disabled={savingPost || !canSavePost}
                    onClick={() => void savePost()}
                  >
                    {savingPost ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                  </Button>
                </div>
              </div>
            ) : body ? (
              <PostBody text={body} />
            ) : null}
            {original ? (
              <NestedOriginal original={original} headline={originalHeadline || "Member"} />
            ) : post.shared_post_id ? (
              <div className="mt-3 rounded-xl border border-dashed border-border px-3 py-4 font-body text-sm text-muted-foreground">
                This post is no longer available.
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {post.image_url && !post.shared_post_id ? (
        <FeedMedia
          url={post.image_url}
          mediaType={post.media_type}
          onOpenImage={feedMediaKind(post.image_url, post.media_type) === "image" ? () => setLightbox(true) : undefined}
        />
      ) : null}

      {reactionCount > 0 || comments.length > 0 || shareCount > 0 ? (
        <div className="flex items-center justify-between gap-3 px-4 py-2 sm:px-5">
          {reactionCount > 0 ? (
            <span className="flex items-center gap-1.5 font-body text-xs text-muted-foreground">
              <span className="flex -space-x-1">
                {chips.slice(0, 3).map((chip) => (
                  <span
                    key={chip.id}
                    className="flex h-5 w-5 items-center justify-center rounded-full border border-card bg-muted text-[11px] leading-none"
                    title={`${chip.label} · ${chip.count}`}
                  >
                    {chip.emoji}
                  </span>
                ))}
              </span>
              {reactionCount}
            </span>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-3">
            {comments.length > 0 ? (
              <button
                type="button"
                className="font-body text-xs text-muted-foreground hover:text-foreground hover:underline"
                onClick={onToggleComments}
              >
                {comments.length} comment{comments.length === 1 ? "" : "s"}
              </button>
            ) : null}
            {shareCount > 0 ? (
              <span className="font-body text-xs text-muted-foreground">
                {shareCount} share{shareCount === 1 ? "" : "s"}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-3 border-t border-border">
        <FeedReactButton current={myReaction} onReact={onReact} />
        <Button type="button" variant="ghost" className="h-11 rounded-none px-1 font-heading text-xs sm:px-3 sm:text-sm" onClick={onToggleComments}>
          <MessageCircle className="h-4 w-4" />
          Comment
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-11 rounded-none px-1 font-heading text-xs sm:px-3 sm:text-sm"
          onClick={() => setShareOpen(true)}
        >
          <Repeat2 className="h-4 w-4" />
          Share
        </Button>
      </div>

      {commentsOpen ? (
        <div className="space-y-3 border-t border-border bg-muted/20 px-4 py-3 sm:px-5">
          {comments.map((comment) => (
            <FeedComment
              key={comment.id}
              comment={comment}
              currentUser={currentUser}
              canModerate={own}
              onEdit={(body) => onEditComment(comment.id, body)}
              onDelete={() => onDeleteComment(comment.id)}
            />
          ))}
          <div className="flex gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={currentUser.avatarUrl || undefined} alt="" />
              <AvatarFallback className="text-[10px]">{getInitials(currentUser.fullName)}</AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-1 items-end gap-2">
              <Textarea
                value={commentDraft}
                onChange={(e) => onCommentDraftChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    onComment()
                  }
                }}
                placeholder="Add a comment…"
                className="min-h-[40px] resize-none rounded-2xl bg-card"
                maxLength={1000}
                rows={1}
              />
              <Button
                type="button"
                size="sm"
                className="rounded-full"
                disabled={commentSending || !commentDraft.trim()}
                onClick={onComment}
              >
                {commentSending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <FeedShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        post={post}
        headline={originalHeadline || headline}
        sharing={sharing}
        onShareToFeed={onShareToFeed}
        onCopyLink={() => {
          onCopyLink()
          setShareOpen(false)
        }}
      />

      <Dialog open={lightbox} onOpenChange={setLightbox}>
        <DialogContent className="max-w-4xl overflow-hidden border-0 bg-black p-0 text-white [&_button]:text-white">
          <DialogTitle className="sr-only">Post photo</DialogTitle>
          {post.image_url ? <img src={post.image_url} alt="" className="max-h-[85vh] w-full object-contain" /> : null}
        </DialogContent>
      </Dialog>
    </Card>
  )
}
