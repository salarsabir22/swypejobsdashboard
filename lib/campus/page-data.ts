import { requireCampusCapability, scopedCampus, type CampusCapability } from "@/lib/campus/rbac"
import { loadCampusSnapshot } from "@/lib/campus/metrics"

export async function campusPageData(
  campus: string | string[] | undefined,
  capability: CampusCapability
) {
  const access = await requireCampusCapability(capability)
  const requested = typeof campus === "string" ? campus : undefined
  return loadCampusSnapshot(access, scopedCampus(access, requested))
}
