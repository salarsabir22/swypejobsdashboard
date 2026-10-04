"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { Briefcase, ChevronRight, GraduationCap, Hash, MapPin, UserRound } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { getBlockedPeerIds } from "@/lib/moderation/blocks"
import { useToast } from "@/lib/hooks/use-toast"
import { cn, getInitials } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { FeedComposer } from "./FeedComposer"
import { FeedPostCard } from "./FeedPostCard"
import { one, withEditedComment, withEditedPost, withoutComment, type FeedCurrentUser, type LikeRow, type PostRow } from "./types"
import { isFeedReaction, type FeedReactionId } from "@/lib/feed/reactions"
import { classifyFeedFile, validateFeedMedia, type FeedMediaKind } from "@/lib/feed/media"
import { formatFeedHeadline } from "@/lib/feed/headline"
import { copyShareLink } from "@/lib/share/share-link"
import { FeedCardsSkeleton } from "@/components/skeletons"

export type { FeedCurrentUser }

type Filter = "all" | "student" | "recruiter"

type RailJob = {
  id: string
  title: string
  location: string | null
  is_remote: boolean
  job_type: string
  company_name: string | null
  logo_url: string | null
}

type RailChannel = {
  id: string
  name: string
  description: string | null
}

function isMissingRelation(message: string | undefined, code?: string) {
  if (code === "PGRST205" || code === "42P01") return true
  const text = (message || "").toLowerCase()
  return (
    (text.includes("could not find the table") || text.includes("does not exist")) &&
    text.includes("feed_posts")
  )
}

const POST_SELECT = `
  id, body, image_url, media_type, created_at, updated_at, author_id, shared_post_id,
  profiles!feed_posts_author_id_fkey ( id, full_name, avatar_url, role ),
  feed_post_likes ( user_id, reaction ),
  feed_post_comments (
    id, body, created_at, updated_at, author_id,
    profiles!feed_post_comments_author_id_fkey ( id, full_name, avatar_url, role )
  ),
  shared:feed_posts!shared_post_id (
    id, body, image_url, media_type, created_at, author_id,
    profiles!feed_posts_author_id_fkey ( id, full_name, avatar_url, role )
  )
`

const POST_SELECT_NO_MEDIA_TYPE = `
  id, body, image_url, created_at, updated_at, author_id, shared_post_id,
  profiles!feed_posts_author_id_fkey ( id, full_name, avatar_url, role ),
  feed_post_likes ( user_id, reaction ),
  feed_post_comments (
    id, body, created_at, updated_at, author_id,
    profiles!feed_post_comments_author_id_fkey ( id, full_name, avatar_url, role )
  ),
  shared:feed_posts!shared_post_id (
    id, body, image_url, created_at, author_id,
    profiles!feed_posts_author_id_fkey ( id, full_name, avatar_url, role )
  )
`

const POST_SELECT_NO_COMMENT_EDIT = `
  id, body, image_url, created_at, updated_at, author_id, shared_post_id,
  profiles!feed_posts_author_id_fkey ( id, full_name, avatar_url, role ),
  feed_post_likes ( user_id, reaction ),
  feed_post_comments (
    id, body, created_at, author_id,
    profiles!feed_post_comments_author_id_fkey ( id, full_name, avatar_url, role )
  ),
  shared:feed_posts!shared_post_id (
    id, body, image_url, created_at, author_id,
    profiles!feed_posts_author_id_fkey ( id, full_name, avatar_url, role )
  )
`

const POST_SELECT_NO_SHARE = `
  id, body, image_url, created_at, updated_at, author_id,
  profiles!feed_posts_author_id_fkey ( id, full_name, avatar_url, role ),
  feed_post_likes ( user_id, reaction ),
  feed_post_comments (
    id, body, created_at, author_id,
    profiles!feed_post_comments_author_id_fkey ( id, full_name, avatar_url, role )
  )
`

const POST_SELECT_LEGACY = `
  id, body, image_url, created_at, author_id,
  profiles!feed_posts_author_id_fkey ( id, full_name, avatar_url, role ),
  feed_post_likes ( user_id ),
  feed_post_comments (
    id, body, created_at, author_id,
    profiles!feed_post_comments_author_id_fkey ( id, full_name, avatar_url, role )
  )
`

function FeedIdentityCard({
  currentUser,
  postCount,
}: {
  currentUser: FeedCurrentUser
  postCount: number
}) {
  const hiring = currentUser.role === "recruiter"
  const headline = formatFeedHeadline(currentUser.headline) || (hiring ? "Recruiter" : "Student")

  return (
    <Card className="overflow-hidden">
      <Link href="/profile" className="block rounded-t-xl outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <div className="relative h-[4.25rem] bg-primary">
          <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/25" />
          <div className="absolute -right-6 -top-8 h-24 w-24 rounded-full border border-white/10" aria-hidden />
          <div className="absolute -bottom-10 -left-8 h-20 w-20 rounded-full border border-white/10" aria-hidden />
        </div>
        <div className="px-3.5 pb-3.5">
          <Avatar className="-mt-8 h-[4.25rem] w-[4.25rem] border-[3px] border-card shadow-sm">
            <AvatarImage src={currentUser.avatarUrl || undefined} alt="" />
            <AvatarFallback className="text-sm">{getInitials(currentUser.fullName)}</AvatarFallback>
          </Avatar>
          <p className="mt-2.5 truncate font-heading text-[15px] font-semibold leading-tight tracking-tight hover:underline">
            {currentUser.fullName}
          </p>
          <p className="mt-1 line-clamp-2 font-body text-xs leading-snug text-muted-foreground">{headline}</p>
          <span
            className={cn(
              "mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-data text-[10px] font-medium uppercase tracking-wide",
              hiring ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            )}
          >
            {hiring ? <Briefcase className="h-2.5 w-2.5" /> : <GraduationCap className="h-2.5 w-2.5" />}
            {hiring ? "Hiring" : "Student"}
          </span>
        </div>
      </Link>
      <div className="flex items-baseline justify-between gap-2 border-t border-border px-3.5 py-2.5">
        <span className="font-body text-[11px] text-muted-foreground">Your posts</span>
        <span className="font-heading text-sm font-semibold tabular-nums">{postCount}</span>
      </div>
      <Link
        href="/profile"
        className="flex items-center justify-center gap-0.5 border-t border-border px-3.5 py-2.5 font-heading text-xs font-medium text-primary transition-colors hover:bg-muted/60"
      >
        View profile
        <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    </Card>
  )
}

export function FeedPageClient({ currentUser }: { currentUser: FeedCurrentUser }) {
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [posts, setPosts] = useState<PostRow[]>([])
  const [headlines, setHeadlines] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [setupMissing, setSetupMissing] = useState(false)
  const [body, setBody] = useState("")
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [mediaPreview, setMediaPreview] = useState<string | null>(null)
  const [mediaKind, setMediaKind] = useState<FeedMediaKind | null>(null)
  const [posting, setPosting] = useState(false)
  const [openComments, setOpenComments] = useState<string | null>(null)
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({})
  const [commentSending, setCommentSending] = useState<string | null>(null)
  const [sharingId, setSharingId] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>("all")
  const [jobs, setJobs] = useState<RailJob[]>([])
  const [channels, setChannels] = useState<RailChannel[]>([])
  const [composerKey, setComposerKey] = useState(0)

  const loadHeadlines = useCallback(async (authorIds: string[]) => {
    const ids = [...new Set(authorIds)]
    if (ids.length === 0) return
    const supabase = createClient()
    const [{ data: students }, { data: recruiters }] = await Promise.all([
      supabase.from("student_profiles").select("id, university, degree").in("id", ids),
      supabase.from("recruiter_profiles").select("id, company_name, industry").in("id", ids),
    ])
    const next: Record<string, string> = {}
    for (const row of students || []) {
      next[row.id] = formatFeedHeadline([row.degree, row.university].filter(Boolean).join(" · "))
    }
    for (const row of recruiters || []) {
      next[row.id] = formatFeedHeadline([row.company_name, row.industry].filter(Boolean).join(" · "))
    }
    setHeadlines((prev) => ({ ...prev, ...next }))
  }, [])

  const loadPosts = useCallback(async () => {
    const supabase = createClient()
    const blocked = await getBlockedPeerIds(supabase, currentUser.id)
    let data: PostRow[] | null = null
    let error: { message?: string; code?: string } | null = null
    for (const select of [POST_SELECT, POST_SELECT_NO_MEDIA_TYPE, POST_SELECT_NO_COMMENT_EDIT, POST_SELECT_NO_SHARE, POST_SELECT_LEGACY]) {
      const res = await supabase.from("feed_posts").select(select).order("created_at", { ascending: false }).limit(50)
      if (!res.error) {
        data = (res.data || []) as unknown as PostRow[]
        error = null
        break
      }
      error = res.error
    }

    if (error) {
      if (isMissingRelation(error.message, error.code)) setSetupMissing(true)
      else toast({ variant: "destructive", title: "Couldn’t load feed", description: error.message })
      setLoading(false)
      return
    }

    const rows = (data || []).filter((post) => {
      if (blocked.has(post.author_id)) return false
      const original = one(post.shared)
      if (original && blocked.has(original.author_id)) return false
      return true
    })
    setPosts(rows)
    setSetupMissing(false)
    setLoading(false)
    void loadHeadlines([
      ...rows.map((p) => p.author_id),
      ...rows.map((p) => one(p.shared)?.author_id).filter((id): id is string => Boolean(id)),
    ])
  }, [currentUser.id, loadHeadlines, toast])

  useEffect(() => {
    queueMicrotask(() => {
      void loadPosts()
    })
  }, [loadPosts])

  useEffect(() => {
    if (loading) return
    const id = new URLSearchParams(window.location.search).get("post")
    if (!id) return
    document.getElementById(`post-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [loading, posts])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel("feed-posts")
      .on("postgres_changes", { event: "*", schema: "public", table: "feed_posts" }, () => {
        void loadPosts()
      })
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [loadPosts])

  useEffect(() => {
    const supabase = createClient()
    void (async () => {
      const withCompany = await supabase
        .from("jobs")
        .select("id, title, location, is_remote, job_type, recruiter_profiles(company_name, logo_url)")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(4)

      const jobsData = withCompany.error
        ? (
            await supabase
              .from("jobs")
              .select("id, title, location, is_remote, job_type")
              .eq("is_active", true)
              .order("created_at", { ascending: false })
              .limit(4)
          ).data
        : withCompany.data

      if (jobsData) {
        setJobs(
          jobsData.map((job) => {
            const company = one(
              (
                job as {
                  recruiter_profiles?:
                    | { company_name: string | null; logo_url: string | null }
                    | { company_name: string | null; logo_url: string | null }[]
                    | null
                }
              ).recruiter_profiles ?? null
            )
            return {
              id: job.id,
              title: job.title,
              location: job.location,
              is_remote: job.is_remote,
              job_type: job.job_type,
              company_name: company?.company_name ?? null,
              logo_url: company?.logo_url ?? null,
            }
          })
        )
      }

      const { data: channelRows } = await supabase
        .from("community_channels")
        .select("id, name, description")
        .order("name")
        .limit(8)
      setChannels(channelRows || [])
    })()
  }, [])

  const pickMedia = (file: File | null) => {
    if (mediaPreview) URL.revokeObjectURL(mediaPreview)
    if (!file) {
      setMediaFile(null)
      setMediaPreview(null)
      setMediaKind(null)
      return
    }
    const result = validateFeedMedia(file)
    if ("error" in result) {
      toast({ variant: "destructive", title: result.error, description: result.description })
      if (fileRef.current) fileRef.current.value = ""
      return
    }
    setMediaFile(file)
    setMediaKind(result.kind)
    setMediaPreview(URL.createObjectURL(file))
  }

  const clearMedia = () => {
    pickMedia(null)
    if (fileRef.current) fileRef.current.value = ""
  }

  const publish = async () => {
    const content = body.trim()
    if (!content && !mediaFile) {
      toast({ variant: "destructive", title: "Write something first" })
      return
    }
    if (content.length > 3000) {
      toast({ variant: "destructive", title: "Post is too long" })
      return
    }
    setPosting(true)
    const supabase = createClient()
    let imageUrl: string | null = null
    const kind = mediaFile ? classifyFeedFile(mediaFile) : null
    if (mediaFile && kind) {
      const ext = (mediaFile.name.split(".").pop() || (kind === "video" ? "mp4" : "jpg"))
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "") || (kind === "video" ? "mp4" : "jpg")
      const path = `${currentUser.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from("feed-media").upload(path, mediaFile, {
        upsert: false,
        contentType: mediaFile.type || (kind === "video" ? "video/mp4" : "image/jpeg"),
      })
      if (uploadError) {
        setPosting(false)
        toast({
          variant: "destructive",
          title: kind === "video" ? "Couldn’t upload video" : "Couldn’t upload image",
          description: uploadError.message,
        })
        return
      }
      imageUrl = supabase.storage.from("feed-media").getPublicUrl(path).data.publicUrl
    }

    const payload = {
      author_id: currentUser.id,
      body: content,
      image_url: imageUrl,
      media_type: kind,
    }
    let { error } = await supabase.from("feed_posts").insert(payload)
    if (error && kind && /media_type/i.test(error.message || "")) {
      const retry = await supabase.from("feed_posts").insert({
        author_id: currentUser.id,
        body: content,
        image_url: imageUrl,
      })
      error = retry.error
    }
    setPosting(false)
    if (error) {
      toast({ variant: "destructive", title: "Couldn’t post", description: error.message })
      return
    }
    setBody("")
    clearMedia()
    setComposerKey((n) => n + 1)
    await loadPosts()
  }

  const setReaction = async (post: PostRow, reaction: FeedReactionId | null) => {
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
      write(
        (post.feed_post_likes || []).map((row) =>
          row.user_id === currentUser.id ? { ...row, reaction } : row
        )
      )
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
    const { error } = await supabase
      .from("feed_post_likes")
      .insert({ post_id: post.id, user_id: currentUser.id, reaction })
    if (error) {
      await supabase.from("feed_post_likes").insert({ post_id: post.id, user_id: currentUser.id })
    }
  }

  const shareToFeed = async (post: PostRow, commentary: string) => {
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
    await loadPosts()
    return true
  }

  const copyPostLink = async (post: PostRow) => {
    const result = await copyShareLink(`/feed?post=${post.shared_post_id || post.id}`)
    if (result === "copied") toast({ title: "Link copied" })
    else toast({ variant: "destructive", title: "Couldn’t copy link" })
  }

  const addComment = async (postId: string) => {
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

  const visiblePosts = useMemo(() => {
    if (filter === "all") return posts
    return posts.filter((post) => one(post.profiles)?.role === filter)
  }, [filter, posts])

  const yourPostCount = posts.filter((p) => p.author_id === currentUser.id).length

  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "student", label: "Students" },
    { id: "recruiter", label: "Hiring" },
  ]

  return (
    <div className="mx-auto grid max-w-[1120px] gap-6 lg:grid-cols-[15.5rem_minmax(0,1fr)_17.5rem]">
      <aside className="hidden lg:block">
        <div className="sticky top-24">
          <FeedIdentityCard currentUser={currentUser} postCount={yourPostCount} />
        </div>
      </aside>

      <div className="min-w-0 space-y-4">
        <FeedComposer
          key={composerKey}
          currentUser={currentUser}
          body={body}
          onBodyChange={setBody}
          mediaPreview={mediaPreview}
          mediaKind={mediaKind}
          posting={posting}
          fileRef={fileRef}
          onPickFile={pickMedia}
          onClearMedia={clearMedia}
          onPublish={publish}
        />

        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {filters.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 font-heading text-xs font-medium transition-colors",
                filter === item.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {setupMissing ? (
          <Card className="border-dashed">
            <CardContent className="px-6 py-12 text-center">
              <p className="font-heading text-lg font-semibold">Feed isn’t set up yet</p>
              <p className="mx-auto mt-2 max-w-md font-body text-sm text-muted-foreground">
                Run the latest Supabase SQL (`20260912030000_feed_posts.sql` and `20260912060000_feed_reactions_shares.sql`) so posts, reactions, and shares can save.
              </p>
            </CardContent>
          </Card>
        ) : loading ? (
          <FeedCardsSkeleton />
        ) : visiblePosts.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="px-6 py-12 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                <UserRound className="h-5 w-5" />
              </div>
              <p className="font-heading text-lg font-semibold">
                {posts.length === 0 ? "No posts yet" : "Nothing in this filter"}
              </p>
              <p className="mx-auto mt-2 max-w-md font-body text-sm text-muted-foreground">
                {posts.length === 0
                  ? "Share an update, a hiring note, or a question. Students and recruiters both post here."
                  : "Try All, or be the first to post in this view."}
              </p>
            </CardContent>
          </Card>
        ) : (
          visiblePosts.map((post) => {
            const author = one(post.profiles)
            return (
              <FeedPostCard
                key={post.id}
                post={post}
                currentUser={currentUser}
                headline={headlines[post.author_id] || (author?.role === "recruiter" ? "Recruiter" : "Student")}
                originalHeadline={
                  headlines[one(post.shared)?.author_id || ""] ||
                  (one(one(post.shared)?.profiles)?.role === "recruiter" ? "Recruiter" : "Student")
                }
                commentsOpen={openComments === post.id}
                commentDraft={commentDrafts[post.id] || ""}
                commentSending={commentSending === post.id}
                shareCount={posts.filter((row) => row.shared_post_id === post.id).length}
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
            )
          })
        )}
      </div>

      <aside className="hidden lg:block">
        <div className="sticky top-24 space-y-4">
          {jobs.length > 0 ? (
            <Card className="overflow-hidden">
              <div className="border-b border-border px-4 py-3">
                <p className="font-heading text-sm font-semibold">Open roles</p>
                <p className="font-body text-xs text-muted-foreground">Live listings from hiring teams</p>
              </div>
              <CardContent className="divide-y divide-border p-0">
                {jobs.map((job) => (
                  <Link
                    key={job.id}
                    href={`/jobs/${job.id}`}
                    className="flex gap-3 px-4 py-3 transition-colors hover:bg-muted/60"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
                      {job.logo_url ? (
                        <img src={job.logo_url} alt="" className="h-full w-full object-contain p-1" />
                      ) : (
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-heading text-sm font-semibold">{job.title}</p>
                      <p className="truncate font-body text-xs text-muted-foreground">{job.company_name || "Company"}</p>
                      <p className="mt-0.5 flex items-center gap-1 font-body text-[11px] text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {job.is_remote ? "Remote" : job.location || "On site"}
                        <span aria-hidden>·</span>
                        {job.job_type.replaceAll("_", " ")}
                      </p>
                    </div>
                  </Link>
                ))}
              </CardContent>
              <div className="border-t border-border px-4 py-2">
                <Link href="/discover" className="font-heading text-xs font-medium text-primary hover:underline">
                  See more on Discover
                </Link>
              </div>
            </Card>
          ) : null}

          <Card className="overflow-hidden">
            <div className="border-b border-border px-4 py-3">
              <p className="font-heading text-sm font-semibold">Topic rooms</p>
              <p className="font-body text-xs text-muted-foreground">Live discussion in Community</p>
            </div>
            <CardContent className="space-y-1 p-2">
              {channels.length === 0 ? (
                <p className="px-2 py-3 font-body text-xs text-muted-foreground">No channels yet.</p>
              ) : (
                channels.slice(0, 6).map((channel) => (
                  <Link
                    key={channel.id}
                    href={`/community/${channel.id}`}
                    className="flex items-start gap-2 rounded-lg px-2 py-2 hover:bg-muted/60"
                  >
                    <Hash className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0">
                      <span className="block truncate font-heading text-sm font-medium">#{channel.name}</span>
                      {channel.description ? (
                        <span className="line-clamp-1 font-body text-[11px] text-muted-foreground">
                          {channel.description}
                        </span>
                      ) : null}
                    </span>
                  </Link>
                ))
              )}
            </CardContent>
            <div className="border-t border-border px-4 py-2">
              <Link href="/community" className="font-heading text-xs font-medium text-primary hover:underline">
                Open community
              </Link>
            </div>
          </Card>
        </div>
      </aside>
    </div>
  )
}
