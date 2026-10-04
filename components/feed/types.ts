import type { UserRole } from "@/types"

export type Author = {
  id: string
  full_name: string | null
  avatar_url: string | null
  role: string | null
}

export type CommentRow = {
  id: string
  body: string
  created_at: string
  updated_at?: string | null
  author_id: string
  profiles: Author | Author[] | null
}

export type LikeRow = {
  user_id: string
  reaction?: string | null
}

export type SharedOriginal = {
  id: string
  body: string
  image_url: string | null
  media_type?: string | null
  created_at: string
  author_id: string
  profiles: Author | Author[] | null
}

export type PostRow = {
  id: string
  body: string
  image_url: string | null
  media_type?: string | null
  created_at: string
  updated_at?: string | null
  author_id: string
  shared_post_id?: string | null
  shared?: SharedOriginal | SharedOriginal[] | null
  profiles: Author | Author[] | null
  feed_post_likes: LikeRow[] | null
  feed_post_comments: CommentRow[] | null
}

export type FeedCurrentUser = {
  id: string
  fullName: string
  avatarUrl: string | null
  role: UserRole
  headline: string | null
  bio: string | null
  profilePath: string
}

export function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

export function wasEdited(createdAt: string, updatedAt?: string | null) {
  if (!updatedAt) return false
  return new Date(updatedAt).getTime() - new Date(createdAt).getTime() > 2500
}

export function withEditedPost(posts: PostRow[], postId: string, body: string, updatedAt: string): PostRow[] {
  return posts.map((post) => {
    if (post.id === postId) return { ...post, body, updated_at: updatedAt }
    const shared = one(post.shared)
    if (shared?.id === postId) return { ...post, shared: { ...shared, body } }
    return post
  })
}

export function withEditedComment(posts: PostRow[], commentId: string, body: string, updatedAt: string): PostRow[] {
  return posts.map((post) => ({
    ...post,
    feed_post_comments: (post.feed_post_comments || []).map((comment) =>
      comment.id === commentId ? { ...comment, body, updated_at: updatedAt } : comment
    ),
  }))
}

export function withoutComment(posts: PostRow[], commentId: string): PostRow[] {
  return posts.map((post) => ({
    ...post,
    feed_post_comments: (post.feed_post_comments || []).filter((comment) => comment.id !== commentId),
  }))
}
