"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { PenLine } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { fetchFeedPosts } from "@/lib/feed/queries"
import { isFeedReaction, reactionSummary, type FeedReactionId } from "@/lib/feed/reactions"
import { copyShareLink } from "@/lib/share/share-link"
import { useToast } from "@/lib/hooks/use-toast"
import { formatRelativeTime, getInitials } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { FeedPostCard } from "./FeedPostCard"
import { FeedCardsSkeleton } from "@/components/skeletons"
import { FeedMedia } from "./FeedMedia"
import { one, withEditedComment, withEditedPost, withoutComment, type FeedCurrentUser, type LikeRow, type PostRow } from "./types"

export function ProfilePosts({
  profileUserId,
  headline,
  currentUser,
}: {
  profileUserId: string
  headline: string
  currentUser: FeedCurrentUser | null
}) {
  const { toast } = useToast()
  const [posts, setPosts] = useState<PostRow[]>([])
  const [headlines, setHeadlines] = useState<Record<string, string>>({ [profileUserId]: headline })
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState(false)
  const [openComments, setOpenComments] = useState<string | null>(null)
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({})
  const [commentSending, setCommentSending] = useState<string | null>(null)
  const [sharingId, setSharingId] = useState<string | null>(null)
  const isOwn = currentUser?.id === profileUserId

  const loadPosts = useCallback(async () => {
    const supabase = createClient()
    const { posts: rows, missing: tableMissing } = await fetchFeedPosts(supabase, {
      authorId: profileUserId,
      limit: 40,
    })
    setMissing(tableMissing)
    setPosts(rows)
    setLoading(false)

    const extraIds = rows.map((p) => one(p.shared)?.author_id).filter((id): id is string => Boolean(id))
    if (extraIds.length === 0) return
    const [{ data: students }, { data: recruiters }] = await Promise.all([
      supabase.from("student_profiles").select("id, university, degree").in("id", extraIds),
      supabase.from("recruiter_profiles").select("id, company_name, industry").in("id", extraIds),
    ])
    const next: Record<string, string> = { [profileUserId]: headline }
    for (const row of students || []) next[row.id] = [row.degree, row.university].filter(Boolean).join(" · ")
    for (const row of recruiters || []) next[row.id] = [row.company_name, row.industry].filter(Boolean).join(" · ")
    setHeadlines((prev) => ({ ...prev, ...next }))
  }, [headline, profileUserId])

  useEffect(() => {
    queueMicrotask(() => {
      void loadPosts()
    })
  }, [loadPosts])

  const setReaction = async (post: PostRow, reaction: FeedReactionId | null) => {
    if (!currentUser) return
    const current = (post.feed_post_likes || []).find((row) => row.user_id === currentUser.id)
    const currentId = isFeedReaction(current?.reaction) ? current.reaction : current ? "like" : null
    const supabase = createClient()
    const write = (likes: LikeRow[]) =>
      setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, feed_post_likes: likes } : p)))

    if (!reaction || reaction === currentId) {
      if (!current) return
      write((post.feed_post_likes || []).filter((row) => row.user_id !== currentUser.id))
      await supabase.from("feed_post_likes").delete().eq("post_id", post.id).eq("user_id", currentUser.id)
      return
    }
    if (current) {
      write((post.feed_post_likes || []).map((row) => (row.user_id === currentUser.id ? { ...row, reaction } : row)))
      const { error } = await supabase
        .from("feed_post_likes")
        .update({ reaction })
        .eq("post_id", post.id)
        .eq("user_id", currentUser.id)
      if (error) {
        await supabase.from("feed_post_likes").delete().eq("post_id", post.id).eq("user_id", currentUser.id)
        await supabase.from("feed_post_likes").insert({ post_id: post.id, user_id: currentUser.id, reaction })
      }
      return
    }
    write([...(post.feed_post_likes || []), { user_id: currentUser.id, reaction }])
    const { error } = await supabase.from("feed_post_likes").insert({
      post_id: post.id,
      user_id: currentUser.id,
      reaction,
    })
    if (error) await supabase.from("feed_post_likes").insert({ post_id: post.id, user_id: currentUser.id })
  }

  const shareToFeed = async (post: PostRow, commentary: string) => {
    if (!currentUser) return false
    const originalId = post.shared_post_id || post.id
    setSharingId(post.id)
    const supabase = createClient()
    const { error } = await supabase.from("feed_posts").insert({
      author_id: currentUser.id,
      body: commentary,
      shared_post_id: originalId,
    })
    setSharingId(null)
    if (error) {
      if (error.code === "23505") {
        toast({ title: "Already on your feed", description: "You already shared this post." })
        return false
      }
      toast({ variant: "destructive", title: "Couldn’t share", description: error.message })
      return false
    }
    toast({ title: "Shared to your feed" })
    if (isOwn) await loadPosts()
    return true
  }

  const addComment = async (postId: string) => {
    if (!currentUser) return
    const content = (commentDrafts[postId] || "").trim()
    if (!content) return
    setCommentSending(postId)
    const supabase = createClient()
    const { data, error } = await supabase
      .from("feed_post_comments")
      .insert({ post_id: postId, author_id: currentUser.id, body: content })
      .select("id, body, created_at, author_id")
      .single()
    setCommentSending(null)
    if (error || !data) {
      toast({ variant: "destructive", title: "Couldn’t comment", description: error?.message })
      return
    }
    setCommentDrafts((prev) => ({ ...prev, [postId]: "" }))
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              feed_post_comments: [
                ...(p.feed_post_comments || []),
                {
                  ...data,
                  profiles: {
                    id: currentUser.id,
                    full_name: currentUser.fullName,
                    avatar_url: currentUser.avatarUrl,
                    role: currentUser.role,
                  },
                },
              ],
            }
          : p
      )
    )
  }

  const deletePost = async (postId: string) => {
    const supabase = createClient()
    const { error } = await supabase.from("feed_posts").delete().eq("id", postId)
    if (error) {
      toast({ variant: "destructive", title: "Couldn’t delete", description: error.message })
      return
    }
    setPosts((prev) => prev.filter((p) => p.id !== postId))
  }

  const editPost = async (postId: string, body: string) => {
    const updatedAt = new Date().toISOString()
    const supabase = createClient()
    const { error } = await supabase.from("feed_posts").update({ body, updated_at: updatedAt }).eq("id", postId)
    if (error) {
      toast({ variant: "destructive", title: "Couldn’t save post", description: error.message })
      return false
    }
    setPosts((prev) => withEditedPost(prev, postId, body, updatedAt))
    return true
  }

  const editComment = async (commentId: string, body: string) => {
    const updatedAt = new Date().toISOString()
    const supabase = createClient()
    const { error } = await supabase.from("feed_post_comments").update({ body, updated_at: updatedAt }).eq("id", commentId)
    if (error) {
      toast({ variant: "destructive", title: "Couldn’t save comment", description: error.message })
      return false
    }
    setPosts((prev) => withEditedComment(prev, commentId, body, updatedAt))
    return true
  }

  const deleteComment = async (commentId: string) => {
    const supabase = createClient()
    const { error } = await supabase.from("feed_post_comments").delete().eq("id", commentId)
    if (error) {
      toast({ variant: "destructive", title: "Couldn’t delete comment", description: error.message })
      return
    }
    setPosts((prev) => withoutComment(prev, commentId))
  }

  const copyPostLink = async (post: PostRow) => {
    const result = await copyShareLink(`/feed?post=${post.shared_post_id || post.id}`)
    if (result === "copied") toast({ title: "Link copied" })
    else toast({ variant: "destructive", title: "Couldn’t copy link" })
  }

  return (
    <section id="posts" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading text-sm font-semibold">{isOwn ? "Your posts" : "Activity"}</h2>
        {isOwn ? (
          <Button asChild variant="ghost" size="sm" className="h-8 rounded-full">
            <Link href="/feed">
              <PenLine className="h-4 w-4" />
              Write a post
            </Link>
          </Button>
        ) : (
          <Link href="/feed" className="font-body text-xs font-medium text-muted-foreground hover:text-foreground">
            Open feed
          </Link>
        )}
      </div>

      {missing ? (
        <p className="rounded-xl bg-muted/50 px-4 py-5 text-center font-body text-sm text-muted-foreground">
          Feed isn’t set up yet, so posts can’t load here.
        </p>
      ) : loading ? (
        <FeedCardsSkeleton count={2} />
      ) : posts.length === 0 ? (
        <p className="rounded-xl bg-muted/50 px-4 py-5 text-center font-body text-sm text-muted-foreground">
          {isOwn ? "You haven’t posted on Feed yet." : "No posts on Feed yet."}
        </p>
      ) : currentUser ? (
        <div className="space-y-4">
          {posts.map((post) => (
            <FeedPostCard
              key={post.id}
              post={post}
              currentUser={currentUser}
              headline={headlines[post.author_id] || headline}
              originalHeadline={headlines[one(post.shared)?.author_id || ""] || "Member"}
              commentsOpen={openComments === post.id}
              commentDraft={commentDrafts[post.id] || ""}
              commentSending={commentSending === post.id}
              shareCount={0}
              sharing={sharingId === post.id}
              onToggleComments={() => setOpenComments((id) => (id === post.id ? null : post.id))}
              onReact={(reaction) => void setReaction(post, reaction)}
              onComment={() => void addComment(post.id)}
              onCommentDraftChange={(value) => setCommentDrafts((prev) => ({ ...prev, [post.id]: value }))}
              onShareToFeed={(commentary) => shareToFeed(post, commentary)}
              onCopyLink={() => void copyPostLink(post)}
              onDelete={() => void deletePost(post.id)}
              onEdit={(body) => editPost(post.id, body)}
              onEditComment={(commentId, body) => editComment(commentId, body)}
              onDeleteComment={(commentId) => void deleteComment(commentId)}
              onBlocked={() => void loadPosts()}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const author = one(post.profiles)
            const name = author?.full_name || "Member"
            const { total } = reactionSummary(post.feed_post_likes)
            const comments = post.feed_post_comments?.length || 0
            return (
              <Card key={post.id} className="overflow-hidden">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={author?.avatar_url || undefined} alt="" />
                      <AvatarFallback className="text-xs">{getInitials(name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate font-heading text-sm font-semibold">{name}</p>
                      <p className="truncate font-body text-xs text-muted-foreground">
                        {headline}
                        <span aria-hidden> · </span>
                        {formatRelativeTime(post.created_at)}
                      </p>
                    </div>
                  </div>
                  {post.body.trim() ? (
                    <p className="mt-3 whitespace-pre-wrap font-body text-sm leading-relaxed">{post.body}</p>
                  ) : null}
                  {post.image_url && !post.shared_post_id ? (
                    <div className="mt-3 overflow-hidden rounded-xl">
                      <FeedMedia url={post.image_url} mediaType={post.media_type} maxClassName="max-h-72" />
                    </div>
                  ) : null}
                  {total > 0 || comments > 0 ? (
                    <p className="mt-3 font-body text-xs text-muted-foreground">
                      {total > 0 ? `${total} reaction${total === 1 ? "" : "s"}` : ""}
                      {total > 0 && comments > 0 ? " · " : ""}
                      {comments > 0 ? `${comments} comment${comments === 1 ? "" : "s"}` : ""}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            )
          })}
          <p className="text-center font-body text-xs text-muted-foreground">
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>{" "}
            to react, comment, or share.
          </p>
        </div>
      )}
    </section>
  )
}
