/** Supabase may return a joined row as an object or a one-element array depending on relation config */
export function coalesceRelation<T>(relation: T | T[] | null | undefined): T | undefined {
  if (relation == null) return undefined
  return Array.isArray(relation) ? relation[0] : relation
}
