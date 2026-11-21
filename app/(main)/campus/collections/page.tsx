import { Layers } from "lucide-react"
import { loadCampusSnapshot } from "@/lib/campus/metrics"
import { requireCampusCapability, scopedCampus } from "@/lib/campus/rbac"
import { jobVisibleOnCampus, reviewKey, sameCampus } from "@/lib/jobs/curation"
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

  const [snapshot, collectionsRes, jobsRes, reviewsRes] = await Promise.all([
    loadCampusSnapshot(access, university, params.range, { from: params.from, to: params.to }),
    admin
      .from("job_collections")
      .select("id, name, description, is_active")
      .eq("university", university)
      .order("created_at", { ascending: false })
      .limit(40),
    admin
      .from("jobs")
      .select("id, title, job_type, category, is_active, created_at, distribution_scope, target_universities, recruiter_profiles(company_name)")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(300),
    admin.from("campus_job_reviews").select("job_id, university, status").limit(2000),
  ])

  // Only this campus's review decisions count; IoBM spellings are treated as one campus.
  const reviews = new Map<string, string>()
  for (const row of reviewsRes.error ? [] : reviewsRes.data || []) {
    if (!sameCampus(row.university, university)) continue
    reviews.set(reviewKey(row.job_id, university), row.status)
  }

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
      description="Listings selected for student and alumni visibility. The list defaults to CDC-approved live jobs; filter by type or category, then feature or remove a job without unpublishing the employer’s original posting."
    >
      <DashboardPanel title="Collections" description="CDC-approved, live listings are shown by default. Holds and rejections are excluded.">
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
            jobs={(jobsRes.data || [])
              .filter((j) => {
                if (!jobVisibleOnCampus(j, university, reviews)) return false
                const status = reviews.get(reviewKey(j.id, university))
                return status !== "rejected" && status !== "held"
              })
              .map((j) => {
                const companyRel = j.recruiter_profiles as { company_name?: string } | { company_name?: string }[] | null
                const company = Array.isArray(companyRel) ? companyRel[0]?.company_name : companyRel?.company_name
                return {
                  id: j.id,
                  title: j.title,
                  company,
                  jobType: j.job_type || null,
                  category: j.category || null,
                  approval: reviews.get(reviewKey(j.id, university)) || "unreviewed",
                }
              })}
          />
        )}
      </DashboardPanel>
    </CampusFrame>
  )
}
