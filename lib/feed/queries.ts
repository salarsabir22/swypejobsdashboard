import type { SupabaseClient } from "@supabase/supabase-js"
import type { PostRow } from "@/components/feed/types"

export const FEED_POST_SELECT = `
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

const FEED_POST_SELECT_NO_MEDIA_TYPE = `
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

const FEED_POST_SELECT_NO_COMMENT_EDIT = `
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

const FEED_POST_SELECT_NO_SHARE = `
  id, body, image_url, created_at, updated_at, author_id,
  profiles!feed_posts_author_id_fkey ( id, full_name, avatar_url, role ),
  feed_post_likes ( user_id, reaction ),
  feed_post_comments (
    id, body, created_at, author_id,
    profiles!feed_post_comments_author_id_fkey ( id, full_name, avatar_url, role )
  )
`

const FEED_POST_SELECT_LEGACY = `
  id, body, image_url, created_at, author_id,
  profiles!feed_posts_author_id_fkey ( id, full_name, avatar_url, role ),
  feed_post_likes ( user_id ),
  feed_post_comments (
    id, body, created_at, author_id,
    profiles!feed_post_comments_author_id_fkey ( id, full_name, avatar_url, role )
  )
`

export async function fetchFeedPosts(
  supabase: SupabaseClient,
  opts?: { authorId?: string; limit?: number }
): Promise<{ posts: PostRow[]; error: string | null; missing: boolean }> {
  const limit = opts?.limit ?? 50
  let lastError: string | null = null
  let missing = false

  for (const select of [FEED_POST_SELECT, FEED_POST_SELECT_NO_MEDIA_TYPE, FEED_POST_SELECT_NO_COMMENT_EDIT, FEED_POST_SELECT_NO_SHARE, FEED_POST_SELECT_LEGACY]) {
    let query = supabase.from("feed_posts").select(select).order("created_at", { ascending: false }).limit(limit)
    if (opts?.authorId) query = query.eq("author_id", opts.authorId)
    const { data, error } = await query
    if (!error) return { posts: (data || []) as unknown as PostRow[], error: null, missing: false }
    lastError = error.message
    const text = (error.message || "").toLowerCase()
    if (error.code === "PGRST205" || error.code === "42P01" || (text.includes("feed_posts") && text.includes("does not exist"))) {
      missing = true
      break
    }
  }

  return { posts: [], error: lastError, missing }
}
