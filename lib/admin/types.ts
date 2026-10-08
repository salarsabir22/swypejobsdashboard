import type { AdminStaffRole } from "@/lib/admin/access"
import type { CountRow } from "@/lib/campus/types"

export type AdminSnapshot = {
  staffRole: AdminStaffRole
  missingTables: string[]
  health: { label: string; ok: boolean; detail: string }
  kpis: {
    liveUsers: number
    dau: number
    wau: number
    mau: number
    pendingEmployers: number
    pendingJobs: number
    openReports: number
    slaBreaches: number
    newStudents: number
    newEmployers: number
    newUniversities: number
    mrr: number | null
  }
  traffic: {
    peakHours: CountRow[]
    signups7: number
    churnProxy: number | null
    sources: CountRow[]
    devices: CountRow[]
    geos: CountRow[]
    universities: CountRow[]
    funnel: { label: string; value: number }[]
    retention: { d1: number | null; d7: number | null; d30: number | null }
  }
  matching: {
    swipes: number
    rightRatio: number | null
    matchRate: number | null
    interviewRate: number | null
    hireRate: number | null
    coldStartUsers: number
  }
}
