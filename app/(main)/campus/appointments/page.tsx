import { campusPageData } from "@/lib/campus/page-data"
import { canCampus } from "@/lib/campus/rbac"
import { CampusFrame } from "@/components/campus/CampusFrame"
import { AppointmentDesk } from "@/components/campus/AppointmentDesk"

export default async function CampusAppointmentsPage({ searchParams }: { searchParams: Promise<{ campus?: string }> }) {
  const { campus } = await searchParams
  const snapshot = await campusPageData(campus, "view_advising")
  return (
    <CampusFrame
      snapshot={snapshot}
      title="Advising appointments"
      description="Student requests. Confirming a slot sends the student an in-app notice."
    >
      <AppointmentDesk canMutate={canCampus(snapshot.access, "mutate")} />
    </CampusFrame>
  )
}
