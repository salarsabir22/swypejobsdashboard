/** Resolve `/chat/[conversationId]` when Supabase returns `conversations` on a match row */
export function conversationChatHref(conversations: unknown): string | null {
  if (Array.isArray(conversations) && conversations.length > 0) {
    const id = (conversations[0] as { id?: string })?.id
    if (id) return `/chat/${id}`
  }
  if (conversations && typeof conversations === "object" && "id" in conversations) {
    const id = (conversations as { id: string }).id
    if (id) return `/chat/${id}`
  }
  return null
}
