import { requireCampusCapability, scopedCampus, type CampusCapability } from "@/lib/campus/rbac"
import { loadCampusSnapshot } from "@/lib/campus/metrics"

export type CampusSearchParams = {
  campus?: string
  range?: string
  from?: string
  to?: string
  kind?: string
  q?: string
  page?: string
  segment?: string
}

export async function campusPageData(
  campus: string | string[] | undefined,
  capability: CampusCapability,
  range?: string | string[] | undefined,
  bounds?: { from?: string | string[] | null; to?: string | string[] | null }
) {
  const access = await requireCampusCapability(capability)
  const requested = typeof campus === "string" ? campus : undefined
  const rangeId = typeof range === "string" ? range : undefined
  return loadCampusSnapshot(access, scopedCampus(access, requested), rangeId, bounds)
}

export async function campusReportData(
  searchParams: Promise<CampusSearchParams>,
  capability: CampusCapability = "view_reports"
) {
  const { campus, range, from, to } = await searchParams
  return campusPageData(campus, capability, range, { from, to })
}

/** Resolve snapshot + raw params so ops pages keep campus/range/from/to in sync with the filter UI. */
export async function loadCampusPage<T extends CampusSearchParams>(
  searchParams: Promise<T>,
  capability: CampusCapability
) {
  const params = await searchParams
  const snapshot = await campusPageData(params.campus, capability, params.range, {
    from: params.from,
    to: params.to,
  })
  return { snapshot, params }
}
