export function formatFeedHeadline(value: string | null | undefined) {
  if (!value) return ""
  const small = new Set(["of", "and", "the", "in", "at", "for", "to"])
  return value
    .split(" · ")
    .map((part) => {
      const tokens = part.trim().split(/\s+/).filter(Boolean)
      return tokens
        .map((token, i) => {
          if (/^[A-Za-z]{1,4}$/.test(token) || token.length <= 3) return token.toUpperCase()
          const lower = token.toLowerCase()
          if (i > 0 && small.has(lower)) return lower
          return lower.charAt(0).toUpperCase() + lower.slice(1)
        })
        .join(" ")
    })
    .filter(Boolean)
    .join(" · ")
}
