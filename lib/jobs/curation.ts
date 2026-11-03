export const CURATED_BADGE = "Campus curated"
export const FEED_CURATED = "cdc_curated"
export const FEED_ALL = "all"
export const FEED_STORAGE_KEY = "discover.feedMode"

export type DiscoverFeedMode = typeof FEED_CURATED | typeof FEED_ALL

export function parseFeedMode(value: string | null | undefined): DiscoverFeedMode {
  return value === FEED_ALL ? FEED_ALL : FEED_CURATED
}

function campusKey(value: string) {
  const name = value.trim().toLowerCase()
  if (name.includes("iobm") || name.includes("institute of business management")) {
    return "iobm"
  }
  return name
}

export function sameCampus(a?: string | null, b?: string | null) {
  if (!a || !b) return false
  return campusKey(a) === campusKey(b)
}

export function jobVisibleOnCampus(
  job: {
    id: string
    distribution_scope?: string | null
    target_universities?: string[] | null
  },
  university: string | null | undefined,
  reviews: Map<string, string>
) {
  const targets = Array.isArray(job.target_universities) ? job.target_universities.filter(Boolean) : []
  const partnerOnly = job.distribution_scope === "partner_universities" || targets.length > 0
  if (!partnerOnly) return true
  if (!university) return false
  const allowed = targets.some((name) => sameCampus(name, university))
  if (!allowed) return false
  const status = reviews.get(`${job.id}:${university.trim().toLowerCase()}`)
  return status === "approved"
}

export function reviewKey(jobId: string, university: string) {
  return `${jobId}:${university.trim().toLowerCase()}`
}
