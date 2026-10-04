import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Globe, Users, Briefcase, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ShareButton } from "@/components/share/ShareButton"
import { ReportBlockMenu } from "@/components/moderation/ReportBlockMenu"
import { formatDate } from "@/lib/utils"
import { formatSalary } from "@/lib/jobs/salary"
import type { Job, UserRole } from "@/types"
import { ProfileHero } from "@/components/profile/ProfileHero"
import { ProfilePosts } from "@/components/feed/ProfilePosts"
import { profileSharePath } from "@/lib/share/profile-path"

export default async function CompanyPublicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: company } = await supabase.from("recruiter_profiles").select("*").eq("id", id).maybeSingle()
  if (!company) notFound()

  const [{ data: jobs }, { data: viewer }, { data: host }] = await Promise.all([
    supabase
      .from("jobs")
      .select("*")
      .eq("recruiter_id", id)
      .eq("is_active", true)
      .order("created_at", { ascending: false }),
    user
      ? supabase.from("profiles").select("id, role, full_name, avatar_url, bio").eq("id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
  ])

  const listings = (jobs || []) as Job[]
  const isStudent = viewer?.role === "student"
  const isOwner = user?.id === id
  const meta = [company.industry, company.employee_count ? `${company.employee_count} people` : null].filter(Boolean)

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <ProfileHero
        userId={id}
        name={company.company_name}
        headline={meta.join(" · ") || "Company"}
        avatarUrl={company.logo_url}
        coverUrl={host?.cover_url}
        editable={isOwner}
        photoKind="logo"
        actions={
          <>
            <ShareButton path={`/company/${id}`} title={company.company_name} label="Share" />
            {user && user.id !== id ? (
              <ReportBlockMenu currentUserId={user.id} peerId={id} peerName={company.company_name} />
            ) : null}
            {!user ? (
              <Button asChild size="sm" className="rounded-full">
                <Link href={`/login?next=${encodeURIComponent(`/company/${id}`)}`}>Sign in</Link>
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0 space-y-6">
          {company.description ? (
            <Card className="shadow-none">
              <CardContent className="p-5 sm:p-6">
                <h2 className="mb-2 font-heading text-sm font-semibold">About</h2>
                <p className="font-body text-sm leading-relaxed text-muted-foreground">{company.description}</p>
              </CardContent>
            </Card>
          ) : null}

          {company.hiring_focus ? (
            <Card className="shadow-none">
              <CardContent className="p-5 sm:p-6">
                <h2 className="mb-2 font-heading text-sm font-semibold">Hiring focus</h2>
                <p className="font-body text-sm leading-relaxed text-muted-foreground">{company.hiring_focus}</p>
              </CardContent>
            </Card>
          ) : null}

          <ProfilePosts
            profileUserId={id}
            headline={[company.company_name, company.industry].filter(Boolean).join(" · ") || "Recruiter"}
            currentUser={
              user && viewer
                ? {
                    id: user.id,
                    fullName: viewer.full_name || "You",
                    avatarUrl: viewer.avatar_url,
                    role: (viewer.role as UserRole) || "student",
                    headline: null,
                    bio: viewer.bio,
                    profilePath: profileSharePath(viewer.role, user.id),
                  }
                : null
            }
          />

          <section className="space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-heading text-base font-semibold">Open roles</h2>
              <p className="font-body text-xs text-muted-foreground">
                {listings.length} live listing{listings.length === 1 ? "" : "s"}
              </p>
            </div>
            {listings.length === 0 ? (
              <p className="font-body text-sm text-muted-foreground">No live roles right now.</p>
            ) : (
              <ul className="m-0 list-none space-y-2 p-0">
                {listings.map((job) => {
                  const pay = formatSalary({
                    min: job.salary_min,
                    max: job.salary_max,
                    currency: job.salary_currency,
                    note: job.compensation_note,
                  })
                  const place = job.is_remote ? "Remote" : job.location
                  return (
                    <li key={job.id}>
                      <Card className="transition hover:border-primary/30">
                        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                          <Briefcase className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" />
                          <div className="min-w-0 flex-1">
                            <p className="font-heading text-sm font-semibold">{job.title}</p>
                            <p className="mt-0.5 font-body text-xs text-muted-foreground">
                              {job.job_type.replace(/_/g, " ")}
                              {place ? ` · ${place}` : ""}
                              {pay ? ` · ${pay}` : ""}
                              {" · "}
                              {formatDate(job.created_at)}
                            </p>
                          </div>
                          <Button asChild size="sm" variant={isStudent ? "default" : "outline"} className="shrink-0 rounded-full">
                            <Link href={`/jobs/${job.id}`}>{isStudent ? "Apply" : "Open listing"}</Link>
                          </Button>
                        </CardContent>
                      </Card>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <Card className="shadow-none">
            <CardContent className="space-y-3 p-5">
              <h2 className="font-heading text-sm font-semibold">Details</h2>
              {company.industry ? (
                <p className="flex items-start gap-2 font-body text-sm text-muted-foreground">
                  <Briefcase className="mt-0.5 h-4 w-4 shrink-0" />
                  {company.industry}
                </p>
              ) : null}
              {company.employee_count ? (
                <p className="flex items-start gap-2 font-body text-sm text-muted-foreground">
                  <Users className="mt-0.5 h-4 w-4 shrink-0" />
                  {company.employee_count} people
                </p>
              ) : null}
              {listings.some((j) => j.location || j.is_remote) ? (
                <p className="flex items-start gap-2 font-body text-sm text-muted-foreground">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                  {listings.find((j) => j.is_remote) ? "Remote roles available" : listings.find((j) => j.location)?.location}
                </p>
              ) : null}
              {company.website_url ? (
                <a
                  href={company.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 font-body text-sm text-primary underline-offset-4 hover:underline"
                >
                  <Globe className="h-4 w-4" />
                  Website
                </a>
              ) : null}
              {!company.industry && !company.employee_count && !company.website_url ? (
                <p className="font-body text-sm text-muted-foreground">No extra details yet.</p>
              ) : null}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}
