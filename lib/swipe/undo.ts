import type { SupabaseClient } from "@supabase/supabase-js"

export type UndoResult = { ok: true } | { ok: false; reason: "chat" | "error"; message?: string }

async function quietUnmatch(
  supabase: SupabaseClient,
  opts: { studentId: string; recruiterId: string; jobId: string }
): Promise<boolean> {
  const { data: match } = await supabase
    .from("matches")
    .select("id")
    .eq("student_id", opts.studentId)
    .eq("recruiter_id", opts.recruiterId)
    .eq("job_id", opts.jobId)
    .maybeSingle()

  if (!match) return true

  const { data: conv } = await supabase
    .from("conversations")
    .select("id")
    .eq("match_id", match.id)
    .maybeSingle()

  if (conv) {
    const { count: fromStudent } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", conv.id)
      .eq("sender_id", opts.studentId)

    const { count: total } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", conv.id)

    if ((fromStudent ?? 0) > 0 || (total ?? 0) > 2) return false
  }

  const { error } = await supabase.from("matches").delete().eq("id", match.id)
  return !error
}

export async function undoJobSwipe(
  supabase: SupabaseClient,
  opts: { studentId: string; recruiterId: string; jobId: string }
): Promise<UndoResult> {
  const unmatched = await quietUnmatch(supabase, opts)
  if (!unmatched) {
    return { ok: false, reason: "chat", message: "You already started chatting on this match." }
  }
  const { error } = await supabase
    .from("job_swipes")
    .delete()
    .eq("student_id", opts.studentId)
    .eq("job_id", opts.jobId)
  if (error) return { ok: false, reason: "error", message: error.message }
  return { ok: true }
}

export async function undoCandidateSwipe(
  supabase: SupabaseClient,
  opts: { studentId: string; recruiterId: string; jobId: string }
): Promise<UndoResult> {
  const unmatched = await quietUnmatch(supabase, opts)
  if (!unmatched) {
    return { ok: false, reason: "chat", message: "You already started chatting on this match." }
  }
  const { error } = await supabase
    .from("candidate_swipes")
    .delete()
    .eq("recruiter_id", opts.recruiterId)
    .eq("student_id", opts.studentId)
    .eq("job_id", opts.jobId)
  if (error) return { ok: false, reason: "error", message: error.message }
  return { ok: true }
}
