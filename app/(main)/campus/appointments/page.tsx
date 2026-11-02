import { campusPageData } from "@/lib/campus/page-data"
import { CampusFrame } from "@/components/campus/CampusFrame"
import { AppointmentDesk } from "@/components/campus/AppointmentDesk"

export default async function CampusAppointmentsPage({ searchParams }: { searchParams: Promise<{ campus?: string }> }) {
  const { campus } = await searchParams
  const snapshot = await campusPageData(campus)
  return (
    <CampusFrame
      snapshot={snapshot}
      title="Advising appointments"
      description="Student requests. Confirming a slot sends the student an in-app notice."
    >
      <AppointmentDesk />
    </CampusFrame>
  )
}
