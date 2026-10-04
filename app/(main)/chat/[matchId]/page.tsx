import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import { MatchChatClient } from "@/components/chat/MatchChatClient"
import { coalesceRelation } from "@/lib/dashboard/relations"

type MatchJoin = {
  id: string
  job_id: string
  student_id: string
  recruiter_id: string
  jobs?: { title?: string | null } | { title?: string | null }[] | null
}

const CONVERSATION_SELECT = `
  id,
  match_id,
  matches(
    id,
    job_id,
    student_id,
    recruiter_id,
    jobs(title)
  )
`

export default async function ChatPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  let { data: conversation } = await supabase
    .from("conversations")
    .select(CONVERSATION_SELECT)
    .eq("id", matchId)
    .maybeSingle()

  if (!conversation) {
    const byMatch = await supabase
      .from("conversations")
      .select(CONVERSATION_SELECT)
      .eq("match_id", matchId)
      .maybeSingle()
    conversation = byMatch.data
  }

  if (!conversation) {
    const { data: matchRow } = await supabase
      .from("matches")
      .select("id, student_id, recruiter_id")
      .eq("id", matchId)
      .maybeSingle()

    const isParty = matchRow && (matchRow.student_id === user.id || matchRow.recruiter_id === user.id)
    if (isParty) {
      const inserted = await supabase
        .from("conversations")
        .insert({ match_id: matchRow.id })
        .select(CONVERSATION_SELECT)
        .maybeSingle()
      conversation = inserted.data
      if (!conversation) {
        const retry = await supabase
          .from("conversations")
          .select(CONVERSATION_SELECT)
          .eq("match_id", matchRow.id)
          .maybeSingle()
        conversation = retry.data
      }
    }
  }

  if (!conversation) notFound()

  const match = coalesceRelation(conversation.matches as MatchJoin | MatchJoin[] | null)
  if (!match?.student_id || !match?.recruiter_id) notFound()
  if (match.student_id !== user.id && match.recruiter_id !== user.id) notFound()

  const otherUserId = user.id === match.student_id ? match.recruiter_id : match.student_id
  const job = coalesceRelation(match.jobs)
  const { data: peer } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .eq("id", otherUserId)
    .maybeSingle()

  return (
    <MatchChatClient
      conversationId={conversation.id}
      currentUserId={user.id}
      peer={{
        ...(peer ?? { id: otherUserId, full_name: null, avatar_url: null }),
        profilePath: user.id === match.student_id ? `/company/${otherUserId}` : `/candidates/${otherUserId}`,
      }}
      jobTitle={job?.title}
      matchId={match.id}
    />
  )
}
