import Link from "next/link"
import { Bookmark } from "lucide-react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { formatDate } from "@/lib/utils"
import { SavedJobActions } from "@/components/saved/SavedJobActions"
import { DashboardEmptyState } from "@/components/dashboard/DashboardEmptyState"
import { DashboardPageHeader } from "@/components/dashboard/DashboardPageHeader"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { StatusBadge } from "@/components/ui/status-badge"

type SavedRow = {
  id: string
  created_at: string
  job_id: string
  jobs:
    | {
        id: string
        title: string
        is_active: boolean | null
        job_type: string | null
        location: string | null
        is_remote: boolean | null
        recruiter_profiles:
          | { company_name?: string | null; logo_url?: string | null }
          | Array<{ company_name?: string | null; logo_url?: string | null }>
          | null
      }
    | Array<{
        id: string
        title: string
        is_active: boolean | null
        job_type: string | null
        location: string | null
        is_remote: boolean | null
        recruiter_profiles:
          | { company_name?: string | null; logo_url?: string | null }
          | Array<{ company_name?: string | null; logo_url?: string | null }>
          | null
      }>
    | null
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] || null : value
}

export default async function SavedJobsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login?next=/saved")

  const [{ data: profile }, savedRes] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    supabase
      .from("job_swipes")
      .select(
        "id, created_at, job_id, jobs(id, title, is_active, job_type, location, is_remote, recruiter_profiles(company_name, logo_url))"
      )
      .eq("student_id", user.id)
      .eq("direction", "saved")
      .order("created_at", { ascending: false })
      .limit(60),
  ])
  if (profile?.role !== "student") redirect("/dashboard")

  const { data } = savedRes

  const rows = (data || []) as SavedRow[]

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <DashboardPageHeader
        eyebrow="Discover"
        title="Saved roles"
        description={
          rows.length
            ? `${rows.length} role${rows.length === 1 ? "" : "s"} bookmarked from Discover. Apply when you’re ready.`
            : "Bookmark roles while browsing Discover, then come back here to apply."
        }
        action={
          <Button asChild className="rounded-full">
            <Link href="/discover">Discover jobs</Link>
          </Button>
        }
      />

      {!rows.length ? (
        <DashboardEmptyState
          icon={Bookmark}
          title="No saved roles yet"
          description="Tap Save on a role in Discover. It will show up here so you can apply later."
          primaryAction={{ href: "/discover", label: "Open Discover" }}
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => {
            const job = one(row.jobs)
            if (!job) return null
            const company = one(job.recruiter_profiles)
            const place = job.is_remote ? "Remote" : job.location
            return (
              <li key={row.id}>
                <Card>
                  <CardContent className="space-y-3 p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap gap-2">
                          {job.job_type ? <StatusBadge value={job.job_type} /> : null}
                          {!job.is_active ? <StatusBadge value="closed" /> : null}
                        </div>
                        <h2 className="font-heading text-base font-semibold tracking-tight">
                          <Link href={`/jobs/${job.id}`} className="hover:underline">
                            {job.title}
                          </Link>
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          {[company?.company_name, place].filter(Boolean).join(" · ") || "Employer"}
                        </p>
                        <p className="text-[12px] text-muted-foreground">Saved {formatDate(row.created_at)}</p>
                      </div>
                      {company?.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={company.logo_url}
                          alt=""
                          className="h-11 w-11 rounded-xl border border-border object-cover"
                        />
                      ) : null}
                    </div>
                    <SavedJobActions
                      swipeId={row.id}
                      jobId={job.id}
                      jobTitle={job.title}
                      userId={user.id}
                      isActive={job.is_active !== false}
                    />
                  </CardContent>
                </Card>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
