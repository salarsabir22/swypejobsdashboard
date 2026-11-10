import { loadCampusPage } from "@/lib/campus/page-data"
import { canCampus } from "@/lib/campus/rbac"
import { CampusFrame } from "@/components/campus/CampusFrame"
import { AppointmentDesk } from "@/components/campus/AppointmentDesk"
import { InterviewsTodayPanel } from "@/components/campus/InterviewsTodayPanel"
import { DashboardPanel } from "@/components/dashboard/DashboardPanel"

export default async function CampusAppointmentsPage({ searchParams }: { searchParams: Promise<{ campus?: string; range?: string; from?: string; to?: string }> }) {
  const { snapshot } = await loadCampusPage(searchParams, "view_advising")
  return (
    <CampusFrame
      snapshot={snapshot}
      showRange={false}
      title="Advising & interviews"
      description="Student CDC session requests, plus students who have employer interviews scheduled today."
    >
      <DashboardPanel title="Interviews today">
        <InterviewsTodayPanel />
      </DashboardPanel>
      <DashboardPanel title="CDC advising requests">
        <AppointmentDesk canMutate={canCampus(snapshot.access, "mutate")} />
      </DashboardPanel>
    </CampusFrame>
  )
}
