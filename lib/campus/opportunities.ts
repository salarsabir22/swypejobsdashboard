export const OPPORTUNITY_KINDS = [
  { id: "study_abroad", label: "Study abroad" },
  { id: "exchange", label: "Exchange" },
  { id: "dual_degree", label: "Dual degree" },
  { id: "scholarship", label: "Scholarship" },
] as const

export type OpportunityKind = (typeof OPPORTUNITY_KINDS)[number]["id"]

export const OPPORTUNITY_KIND_LABEL: Record<string, string> = Object.fromEntries(
  OPPORTUNITY_KINDS.map((kind) => [kind.id, kind.label])
)

export type CampusOpportunity = {
  id: string
  kind: string
  title: string
  country: string | null
  organization: string | null
  summary: string | null
  eligibility: string | null
  visa_url: string | null
  apply_url: string | null
  deadline: string | null
  is_active: boolean | null
  university?: string | null
  updated_at?: string | null
}

export const OPPORTUNITY_FIELDS =
  "id, kind, title, country, organization, summary, eligibility, visa_url, apply_url, deadline, is_active"

export function isOpportunityKind(value: string | null | undefined): value is OpportunityKind {
  return OPPORTUNITY_KINDS.some((kind) => kind.id === value)
}
