export const FEED_REACTIONS = [
  { id: "like", label: "Like", emoji: "👍", className: "text-[#378fe9]" },
  { id: "celebrate", label: "Celebrate", emoji: "👏", className: "text-[#6dae4f]" },
  { id: "support", label: "Support", emoji: "💪", className: "text-[#7a66cc]" },
  { id: "love", label: "Love", emoji: "❤️", className: "text-[#df704d]" },
  { id: "insightful", label: "Insightful", emoji: "💡", className: "text-[#e7a33e]" },
  { id: "funny", label: "Funny", emoji: "😂", className: "text-[#c37d16]" },
] as const

export type FeedReactionId = (typeof FEED_REACTIONS)[number]["id"]

export function isFeedReaction(value: string | null | undefined): value is FeedReactionId {
  return FEED_REACTIONS.some((item) => item.id === value)
}

export function reactionMeta(id: string | null | undefined) {
  return FEED_REACTIONS.find((item) => item.id === id) ?? FEED_REACTIONS[0]
}

export function reactionSummary(likes: { reaction?: string | null }[] | null | undefined) {
  const counts = new Map<FeedReactionId, number>()
  for (const row of likes || []) {
    const id = isFeedReaction(row.reaction) ? row.reaction : "like"
    counts.set(id, (counts.get(id) || 0) + 1)
  }
  const chips = FEED_REACTIONS.filter((item) => counts.get(item.id)).map((item) => ({
    ...item,
    count: counts.get(item.id) || 0,
  }))
  const total = [...counts.values()].reduce((sum, n) => sum + n, 0)
  return { chips, total }
}
