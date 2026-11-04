import { campusPageData } from "@/lib/campus/page-data"
import { canCampus } from "@/lib/campus/rbac"
import { createClient } from "@/lib/supabase/server"
import { CampusFrame } from "@/components/campus/CampusFrame"
import { AppointmentDesk } from "@/components/campus/AppointmentDesk"
import { DashboardPanel } from "@/components/dashboard/DashboardPanel"

export default async function CampusServicesPage({ searchParams }: { searchParams: Promise<{ campus?: string }> }) {
  const { campus } = await searchParams
  const snapshot = await campusPageData(campus, "view_advising")
  const university = snapshot.access.university
  const supabase = await createClient()

  const [{ data: mentors }, { data: requests }, { count: surveyFiles }] = await Promise.all([
    supabase.from("mentorship_profiles").select("user_id, expertise, is_discoverable").eq("is_discoverable", true).limit(20),
    supabase.from("mentorship_requests").select("id, topic, status, student_id").limit(40),
    supabase.storage.from("career-surveys").list("", { limit: 200 }).then((res) => ({ count: res.data?.filter((f) => f.name.endsWith(".json")).length ?? 0 })),
  ])

  return (
    <CampusFrame
      snapshot={snapshot}
      title="Mentorship & career services"
      description="Alumni mentorship, career surveys for HEC/NBEAC, and CDC advising appointments. Confirming a slot notifies the student."
    >
      <DashboardPanel title="Advising appointments">
        <AppointmentDesk canMutate={canCampus(snapshot.access, "mutate")} />
      </DashboardPanel>
      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardPanel title="Alumni mentors" badge={`${mentors?.length ?? 0}`}>
          {mentors?.length ? (
            <ul className="space-y-2 text-sm">
              {mentors.map((row) => (
                <li key={row.user_id}>{row.expertise || "Mentor"}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No discoverable mentors yet. Alumni opt in from Mentorship.</p>
          )}
        </DashboardPanel>
        <DashboardPanel title="Career surveys" badge={`${surveyFiles}`}>
          <p className="text-sm text-muted-foreground">
            {university ? `${university} ` : ""}
            first-destination responses feed HEC and NBEAC exports. Alumni submit from Profile → Career survey.
          </p>
        </DashboardPanel>
      </div>
      <DashboardPanel title="Mentorship requests" badge={`${requests?.length ?? 0}`}>
        {requests?.length ? (
          <ul className="space-y-2 text-sm">
            {requests.map((row) => (
              <li key={row.id}>
                {row.topic || "Mentorship"} <span className="text-muted-foreground">· {row.status}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No open mentorship requests.</p>
        )}
      </DashboardPanel>
    </CampusFrame>
  )
}
