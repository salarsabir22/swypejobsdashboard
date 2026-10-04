import type { SupabaseClient } from "@supabase/supabase-js"

export async function getBlockedPeerIds(supabase: SupabaseClient, userId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("blocks")
    .select("blocker_id, blocked_id")
    .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`)

  const ids = new Set<string>()
  if (error) return ids
  for (const row of data ?? []) {
    if (row.blocker_id === userId) ids.add(row.blocked_id as string)
    else ids.add(row.blocker_id as string)
  }
  return ids
}

export async function isBlockedWith(
  supabase: SupabaseClient,
  userId: string,
  peerId: string
): Promise<{ blockedByMe: boolean; blockedMe: boolean }> {
  const { data, error } = await supabase
    .from("blocks")
    .select("blocker_id, blocked_id")
    .or(
      `and(blocker_id.eq.${userId},blocked_id.eq.${peerId}),and(blocker_id.eq.${peerId},blocked_id.eq.${userId})`
    )

  let blockedByMe = false
  let blockedMe = false
  if (error) return { blockedByMe, blockedMe }
  for (const row of data ?? []) {
    if (row.blocker_id === userId) blockedByMe = true
    if (row.blocked_id === userId) blockedMe = true
  }
  return { blockedByMe, blockedMe }
}
