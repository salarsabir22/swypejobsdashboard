import { Layers } from "lucide-react"
import { loadCampusSnapshot } from "@/lib/campus/metrics"
import { requireCampusCapability, scopedCampus } from "@/lib/campus/rbac"
import { createAdminClient } from "@/lib/supabase/admin"
import { CampusFrame } from "@/components/campus/CampusFrame"
import { CollectionManager } from "@/components/campus/CollectionManager"
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState"
import { DashboardPanel } from "@/components/dashboard/DashboardPanel"

export default async function CampusCollectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ campus?: string; range?: string; from?: string; to?: string }>
}) {
  const params = await searchParams
  const access = await requireCampusCapability("view_actions")
  const university = scopedCampus(access, params.campus) || access.university || "Campus"
  const admin = createAdminClient()

  const [snapshot, collectionsRes, jobsRes] = await Promise.all([
    loadCampusSnapshot(access, university, params.range, { from: params.from, to: params.to }),
    admin
      .from("job_collections")
      .select("id, name, description, is_active")
      .eq("university", university)
      .order("created_at", { ascending: false })
      .limit(40),
    admin
      .from("jobs")
      .select("id, title, recruiter_profiles(company_name)")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(40),
  ])

  const collectionIds = (collectionsRes.data || []).map((row) => row.id)
  const { data: itemRows } = collectionIds.length
    ? await admin.from("job_collection_items").select("collection_id, job_id").in("collection_id", collectionIds).limit(500)
    : { data: [] as { collection_id: string; job_id: string }[] }

  const jobIdsByCollection = new Map<string, string[]>()
  for (const row of itemRows || []) {
    const list = jobIdsByCollection.get(row.collection_id) || []
    list.push(row.job_id)
    jobIdsByCollection.set(row.collection_id, list)
  }

  return (
    <CampusFrame
      snapshot={snapshot}
      showRange={false}
      title="Curated jobs"
      description="Listings selected for student and alumni visibility. Feature or remove a job here without unpublishing the employer’s original posting."
    >
      <DashboardPanel title="Collections">
        {collectionsRes.error ? (
          <DashboardEmptyState
            icon={Layers}
            title="Collections aren’t available yet"
            description="When this campus workspace is live, you’ll group jobs here so students see the Campus curated badge in Discover."
          />
        ) : (
          <CollectionManager
            university={university}
            collections={(collectionsRes.data || []).map((c) => ({
              id: c.id,
              name: c.name,
              description: c.description,
              is_active: c.is_active,
              jobIds: jobIdsByCollection.get(c.id) || [],
            }))}
            jobs={(jobsRes.data || []).map((j) => {
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
