import { requireCampusCapability, scopedCampus, type CampusCapability } from "@/lib/campus/rbac"
import { loadCampusSnapshot } from "@/lib/campus/metrics"

export async function campusPageData(
  campus: string | string[] | undefined,
  capability: CampusCapability,
  range?: string | string[] | undefined
) {
  const access = await requireCampusCapability(capability)
  const requested = typeof campus === "string" ? campus : undefined
  const rangeId = typeof range === "string" ? range : undefined
  return loadCampusSnapshot(access, scopedCampus(access, requested), rangeId)
}

export async function campusReportData(
  searchParams: Promise<{ campus?: string; range?: string }>,
  capability: CampusCapability = "view_reports"
) {
  const { campus, range } = await searchParams
  return campusPageData(campus, capability, range)
}
