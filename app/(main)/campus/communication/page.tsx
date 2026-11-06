import { MessageCircle } from "lucide-react"
import { loadCampusPage } from "@/lib/campus/page-data"
import { createClient } from "@/lib/supabase/server"
import { CampusFrame } from "@/components/campus/CampusFrame"
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState"
import { DashboardPanel } from "@/components/dashboard/DashboardPanel"

export default async function CampusCommunicationPage({ searchParams }: { searchParams: Promise<{ campus?: string; range?: string; from?: string; to?: string }> }) {
  const { snapshot, params } = await loadCampusPage(searchParams, "view_actions")
  const university = snapshot.access.university
  const supabase = await createClient()

  const studentQuery = university
    ? supabase.from("student_profiles").select("id").eq("university", university).limit(400)
    : supabase.from("student_profiles").select("id").limit(400)
  const { data: students } = await studentQuery
  const ids = (students || []).map((row) => row.id)
  const { data: matches } = ids.length
    ? await supabase.from("matches").select("id, student_id, recruiter_id, jobs(title)").in("student_id", ids.slice(0, 80)).limit(40)
    : { data: [] as { id: string; student_id: string; recruiter_id: string; jobs: { title: string | null } | { title: string | null }[] | null }[] }

  const matchIds = (matches || []).map((row) => row.id)
  const { data: conversations } = matchIds.length
    ? await supabase.from("conversations").select("id, match_id, updated_at").in("match_id", matchIds).order("updated_at", { ascending: false }).limit(20)
    : { data: [] as { id: string; match_id: string; updated_at: string }[] }

  const convIds = (conversations || []).map((row) => row.id)
  const { data: messages } = convIds.length
    ? await supabase.from("messages").select("id, conversation_id, content, created_at, sender_id").in("conversation_id", convIds).order("created_at", { ascending: false }).limit(40)
    : { data: [] as { id: string; conversation_id: string; content: string; created_at: string; sender_id: string }[] }

  const matchByConv = new Map((conversations || []).map((row) => [row.id, row.match_id]))
  const matchById = new Map((matches || []).map((row) => [row.id, row]))

  return (
    <CampusFrame
      snapshot={snapshot}
      title="Communication"
      description="Employer and student message history on this campus. Built-in CDC broadcast messaging is optional in the IoBM source; the live product uses match chat plus campus nudges."
    >
      <DashboardPanel title="Recent match messages">
        {!messages?.length ? (
          <DashboardEmptyState
            icon={MessageCircle}
            title="No campus threads yet"
            description="When students and employers message after a match, the latest lines show here. Use Actions to nudge a quiet cohort."
          />
        ) : (
          <ul className="space-y-3">
            {messages.slice(0, 20).map((row) => {
              const match = matchById.get(matchByConv.get(row.conversation_id) || "")
              const job = match ? (Array.isArray(match.jobs) ? match.jobs[0] : match.jobs) : null
              return (
                <li key={row.id} className="rounded-2xl bg-secondary/40 px-4 py-3">
                  <p className="text-sm font-medium">{job?.title || "Match"}</p>
                  <p className="text-sm text-muted-foreground">{row.content}</p>
                  <p className="mt-1 text-[12px] text-muted-foreground">{new Date(row.created_at).toLocaleString()}</p>
                </li>
              )
            })}
          </ul>
        )}
      </DashboardPanel>
    </CampusFrame>
  )
}
