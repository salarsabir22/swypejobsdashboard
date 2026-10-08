import type { SupabaseClient } from "@supabase/supabase-js"

/** `/chat/[id]` accepts a conversation id or a match id. */
export async function resolveChatPath(
  supabase: SupabaseClient,
  opts: { conversationId?: string | null; matchId?: string | null }
): Promise<string | null> {
  if (opts.conversationId) return `/chat/${opts.conversationId}`
  if (opts.matchId) {
    const { data } = await supabase.from("conversations").select("id").eq("match_id", opts.matchId).maybeSingle()
    if (data?.id) return `/chat/${data.id}`
    return `/chat/${opts.matchId}`
  }
  return null
}

export async function resolveNotificationPath(
  supabase: SupabaseClient,
  n: { type: string; data: Record<string, unknown> | null }
): Promise<string> {
  const payload = (n.data && typeof n.data === "object" ? n.data : {}) as Record<string, unknown>
  const conversationId = typeof payload.conversation_id === "string" ? payload.conversation_id : undefined
  const matchId = typeof payload.match_id === "string" ? payload.match_id : undefined
  const jobId = typeof payload.job_id === "string" ? payload.job_id : undefined
  const studentId = typeof payload.student_id === "string" ? payload.student_id : undefined

  if (
    n.type === "candidate_shortlisted" ||
    n.type === "match" ||
    n.type === "interview_request"
  ) {
    const chatPath = await resolveChatPath(supabase, { conversationId, matchId })
    if (chatPath) return chatPath
    return "/chat"
  }

  if (n.type === "candidate_interested" && studentId) {
    return jobId ? `/candidates/${studentId}?job=${jobId}` : `/candidates/${studentId}`
  }

  if (
    (n.type === "applications_milestone" || n.type === "job_views_milestone") &&
    jobId
  ) {
    return `/jobs/${jobId}`
  }

  if (n.type === "new_jobs_digest") return "/discover"
  if (n.type === "profile_opened" || n.type === "profile_views_milestone") return "/dashboard"
  if (jobId) return `/jobs/${jobId}`
  return "/notifications"
}
