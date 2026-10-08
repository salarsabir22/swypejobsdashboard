import { getCampusAccess } from "@/lib/campus/access"
import { loadCampusSnapshot } from "@/lib/campus/metrics"

export async function campusPageData(campus?: string | string[]) {
  const access = await getCampusAccess()
  const filter = typeof campus === "string" && campus.trim() ? campus.trim() : access.university
  return loadCampusSnapshot(access, filter)
}
