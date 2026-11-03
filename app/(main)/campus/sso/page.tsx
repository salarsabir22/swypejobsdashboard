import { redirect } from "next/navigation"
import { campusPageData } from "@/lib/campus/page-data"
import { CampusFrame } from "@/components/campus/CampusFrame"
import { SsoDesk } from "@/components/campus/SsoDesk"
import { DashboardPanel } from "@/components/dashboard/DashboardPanel"
import { listCampusIdentities, listOpenConflicts } from "@/lib/sso/identity"

export default async function CampusSsoPage({ searchParams }: { searchParams: Promise<{ campus?: string }> }) {
  const { campus } = await searchParams
  const snapshot = await campusPageData(campus)
  const role = snapshot.access.staffRole
  if (snapshot.access.role !== "admin" && role !== "director" && role !== "advisor" && role !== "dean") {
    redirect("/campus")
  }
  const [identities, conflicts] = await Promise.all([listCampusIdentities(), listOpenConflicts()])

  return (
    <CampusFrame
      snapshot={snapshot}
      title="Campus SSO"
      description="IoBM identities are keyed by NameID or OIDC sub, not email. Sync the roster to deprovision leavers, and merge or override student / faculty / employer conflicts here."
    >
      <DashboardPanel title="Identities, roster, and conflicts">
        <SsoDesk identities={identities.rows} conflicts={conflicts.rows} missingTable={identities.missingTable || conflicts.missingTable} />
      </DashboardPanel>
    </CampusFrame>
  )
}
