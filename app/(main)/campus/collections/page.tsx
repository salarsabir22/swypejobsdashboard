import { Layers } from "lucide-react"
import { campusPageData } from "@/lib/campus/page-data"
import { createClient } from "@/lib/supabase/server"
import { CampusFrame } from "@/components/campus/CampusFrame"
import { CollectionManager } from "@/components/campus/CollectionManager"
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState"
import { DashboardPanel } from "@/components/dashboard/DashboardPanel"

export default async function CampusCollectionsPage({ searchParams }: { searchParams: Promise<{ campus?: string }> }) {
  const { campus } = await searchParams
  const snapshot = await campusPageData(campus, "view_actions")
  const university = snapshot.access.university || snapshot.attention[0]?.university || "Campus"
  const supabase = await createClient()
  const { data: collections, error } = await supabase
    .from("job_collections")
    .select("id, name, description, is_active, job_collection_items(job_id)")
    .eq("university", university)
    .order("created_at", { ascending: false })
  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, title, recruiter_profiles(company_name)")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(40)

  return (
    <CampusFrame
      snapshot={snapshot}
      title="Curated jobs"
      description="Listings selected for student and alumni visibility. Feature or remove a job here without unpublishing the employer’s original posting."
    >
      <DashboardPanel title="Collections">
        {error ? (
          <DashboardEmptyState
            icon={Layers}
            title="Collections aren’t available yet"
            description="When this campus workspace is live, you’ll group jobs here so students see the Campus curated badge in Discover."
          />
        ) : (
        <CollectionManager
          university={university}
          collections={(collections || []).map((c) => ({
            id: c.id,
            name: c.name,
            description: c.description,
            is_active: c.is_active,
            jobIds: (c.job_collection_items || []).map((i: { job_id: string }) => i.job_id),
          }))}
          jobs={(jobs || []).map((j) => {
            const companyRel = j.recruiter_profiles as { company_name?: string } | { company_name?: string }[] | null
            const company = Array.isArray(companyRel) ? companyRel[0]?.company_name : companyRel?.company_name
            return { id: j.id, title: j.title, company }
          })}
        />
        )}
      </DashboardPanel>
    </CampusFrame>
  )
}
