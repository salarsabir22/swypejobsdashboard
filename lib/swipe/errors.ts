export function isUniqueViolation(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false
  if (error.code === "23505") return true
  return (error.message || "").toLowerCase().includes("duplicate")
}

export function excludeInFilter(ids: string[]) {
  if (ids.length === 0) return null
  return `(${ids.join(",")})`
}
