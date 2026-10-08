/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import {
  GraduationCap,
  Calendar,
  Github,
  Linkedin,
  FileText,
  Edit,
  CheckCircle,
  Clock,
  Globe,
  Users,
} from "lucide-react"
import { formatDate } from "@/lib/utils"
import Link from "next/link"
import { ProfileVideoBlock } from "@/components/profile/ProfileVideoBlock"
import { ShareButton } from "@/components/share/ShareButton"
import { SavedJobActions } from "@/components/saved/SavedJobActions"
import { CompletenessCard } from "@/components/profile/CompletenessCard"
import { ProfileHero } from "@/components/profile/ProfileHero"
import { recruiterCompleteness, studentCompleteness } from "@/lib/profile/completeness"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ProfilePosts } from "@/components/feed/ProfilePosts"
import { profileSharePath } from "@/lib/share/profile-path"
import { signedStorageUrl } from "@/lib/storage/signed-url"
import { RecruiterIntegrationsCard } from "@/components/hiring/RecruiterIntegrationsCard"
import type { UserRole } from "@/types"

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
  const isStudent = profile?.role === "student"
  const isRecruiter = profile?.role === "recruiter"

  const { data: studentProfile } = isStudent
    ? await supabase.from("student_profiles").select("*").eq("id", user.id).maybeSingle()
    : { data: null }

  const { data: recruiterProfile } = isRecruiter
    ? await supabase.from("recruiter_profiles").select("*").eq("id", user.id).maybeSingle()
    : { data: null }

  const { count: matchCount } = await supabase
    .from("matches")
    .select("*", { count: "exact", head: true })
    .or(`student_id.eq.${user.id},recruiter_id.eq.${user.id}`)

  const { count: activityCount } = isStudent
    ? await supabase.from("job_swipes").select("*", { count: "exact", head: true }).eq("student_id", user.id).eq("direction", "right")
    : await supabase.from("jobs").select("*", { count: "exact", head: true }).eq("recruiter_id", user.id)

  const savedRes = isStudent
    ? await supabase
        .from("job_swipes")
        .select("id, created_at, job_id, jobs(id, title, is_active, job_type, location, is_remote, recruiter_profiles(company_name, logo_url))")
        .eq("student_id", user.id)
        .eq("direction", "saved")
        .order("created_at", { ascending: false })
    : { data: [] as any[] }

  const appliedRes = isStudent
    ? await supabase
        .from("job_swipes")
        .select("id, created_at, jobs(title, recruiter_profiles(company_name))")
        .eq("student_id", user.id)
        .eq("direction", "right")
        .order("created_at", { ascending: false })
        .limit(8)
    : { data: [] as any[] }

  const recruiterJobs = isRecruiter
    ? await supabase.from("jobs").select("id, title, is_active").eq("recruiter_id", user.id).order("created_at", { ascending: false })
    : { data: [] as any[] }

  const postsCountRes = await supabase
    .from("feed_posts")
    .select("id", { count: "exact", head: true })
    .eq("author_id", user.id)
  const postCount = postsCountRes.error ? 0 : postsCountRes.count ?? 0

  const savedRows = savedRes.data || []
  const rp = recruiterProfile as any
  const sp = studentProfile as any
  const resumeHref = sp?.resume_url
    ? await signedStorageUrl(supabase, "resumes", sp.resume_url)
    : null
  const completeness = isStudent
    ? studentCompleteness({
        avatar: profile?.avatar_url,
        bio: profile?.bio,
        university: sp?.university,
        skills: sp?.skills,
        resume: sp?.resume_url,
        video: profile?.profile_video_url,
        linkedin: sp?.linkedin_url,
      })
    : isRecruiter
      ? recruiterCompleteness({
          logo: rp?.logo_url,
          description: rp?.description,
          website: rp?.website_url,
          industry: rp?.industry,
          video: profile?.profile_video_url,
        })
      : null

  const headline = isRecruiter
    ? [rp?.company_name, rp?.industry].filter(Boolean).join(" · ") || "Recruiter"
    : [sp?.degree, sp?.university].filter(Boolean).join(" · ") || "Student"
  const displayName = isRecruiter ? rp?.company_name || profile?.full_name || "Company" : profile?.full_name || "You"

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <ProfileHero
        userId={user.id}
        name={displayName}
        headline={headline}
        subline={<p className="font-body text-xs text-muted-foreground">{user.email}</p>}
        avatarUrl={isRecruiter ? rp?.logo_url || profile?.avatar_url : profile?.avatar_url}
        coverUrl={profile?.cover_url}
        editable
        photoKind={isRecruiter ? "logo" : "avatar"}
        actions={
          <>
            {isStudent || isRecruiter ? (
              <ShareButton
                path={isRecruiter ? `/company/${user.id}` : `/candidates/${user.id}`}
                title={isRecruiter ? rp?.company_name || "Company" : profile?.full_name || "Profile"}
                label="Share profile"
              />
            ) : null}
            <Button asChild variant="outline" size="sm" className="rounded-full">
              <Link href="/onboarding">
                <Edit className="h-4 w-4" />
                Edit
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[240px_1fr]">
        <div className="space-y-4">
          <Card className="shadow-sm">
            <CardContent className="p-4">
              {isRecruiter ? (
                rp?.is_approved ? (
                  <Badge variant="secondary" className="mb-3 text-[10px]">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Approved
                  </Badge>
                ) : (
                  <Badge variant="outline" className="mb-3 text-[10px]">
                    <Clock className="mr-1 h-3 w-3" />
                    Pending
                  </Badge>
                )
              ) : null}
              <div className="grid w-full grid-cols-3 gap-2">
                <div>
                  <p className="font-heading text-sm font-semibold tabular-nums">{activityCount ?? 0}</p>
                  <p className="font-body text-[11px] text-muted-foreground">{isStudent ? "Applied" : "Jobs"}</p>
                </div>
                <div>
                  <p className="font-heading text-sm font-semibold tabular-nums">{matchCount ?? 0}</p>
                  <p className="font-body text-[11px] text-muted-foreground">Matches</p>
                </div>
                <div>
                  <p className="font-heading text-sm font-semibold tabular-nums">{postCount}</p>
                  <p className="font-body text-[11px] text-muted-foreground">Posts</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {completeness ? <CompletenessCard percent={completeness.percent} items={completeness.items} /> : null}
        </div>

        <div className="space-y-4">
          {isRecruiter ? (
            <Card className="shadow-sm">
              <CardContent className="space-y-4 p-5">
                <h2 className="font-data text-[10px] uppercase tracking-wide text-muted-foreground">Company</h2>
                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <dt className="text-[11px] text-muted-foreground">Name</dt>
                    <dd className="font-body text-sm">{rp?.company_name || "Not set"}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-muted-foreground">Industry</dt>
                    <dd className="font-body text-sm">{rp?.industry || "Add in edit"}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-muted-foreground">Employees</dt>
                    <dd className="flex items-center gap-1 font-body text-sm">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      {rp?.employee_count || "Add in edit"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-muted-foreground">Website</dt>
                    <dd className="font-body text-sm">
                      {rp?.website_url ? (
                        <a href={rp.website_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                          <Globe className="h-3.5 w-3.5" />
                          Site
                        </a>
                      ) : (
                        "Add in edit"
                      )}
                    </dd>
                  </div>
                </dl>
                <p className="font-body text-sm leading-relaxed">{rp?.description || "No description yet."}</p>
              </CardContent>
            </Card>
          ) : null}

          {isRecruiter ? <RecruiterIntegrationsCard calendlyUrl={rp?.calendly_url} /> : null}

          <Card className="shadow-sm">
            <CardContent className="p-5">
              <h2 className="mb-2 font-data text-[10px] uppercase tracking-wide text-muted-foreground">About</h2>
              <p className="font-body text-sm leading-relaxed">{profile?.bio || "No bio yet. Add a short summary so people know what you do."}</p>
            </CardContent>
          </Card>

          <ProfileVideoBlock userId={user.id} initialVideoUrl={(profile as any)?.profile_video_url ?? null} />

          <ProfilePosts
            profileUserId={user.id}
            headline={headline}
            currentUser={{
              id: user.id,
              fullName: profile?.full_name || "You",
              avatarUrl: profile?.avatar_url ?? null,
              role: (profile?.role as UserRole) || "student",
              headline,
              bio: profile?.bio ?? null,
              profilePath: profileSharePath(profile?.role, user.id),
            }}
          />

          {isStudent ? (
            <>
              <Card className="shadow-sm">
                <CardContent className="p-5">
                  <h2 className="mb-2 font-data text-[10px] uppercase tracking-wide text-muted-foreground">Education</h2>
                  {sp?.university ? (
                    <div>
                      <p className="flex items-center gap-1.5 font-heading font-semibold">
                        <GraduationCap className="h-4 w-4 text-muted-foreground" />
                        {sp.university}
                      </p>
                      {sp.degree ? <p className="mt-1 font-body text-sm text-muted-foreground">{sp.degree}</p> : null}
                      {sp.graduation_year ? (
                        <p className="mt-1 flex items-center gap-1 font-body text-xs text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          Class of {sp.graduation_year}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <Link href="/onboarding" className="font-body text-sm text-primary hover:underline">
                      Add your university
                    </Link>
                  )}
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardContent className="p-5">
                  <h2 className="mb-3 font-data text-[10px] uppercase tracking-wide text-muted-foreground">Skills</h2>
                  <div className="flex flex-wrap gap-2">
                    {(sp?.skills || []).map((s: string) => (
                      <Badge key={s} variant="secondary" className="font-normal">
                        {s}
                      </Badge>
                    ))}
                    {!sp?.skills?.length ? <p className="font-body text-sm text-muted-foreground">None yet.</p> : null}
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardContent className="space-y-2 p-5">
                  <h2 className="mb-2 font-data text-[10px] uppercase tracking-wide text-muted-foreground">Links</h2>
                  {sp?.linkedin_url ? (
                    <a href={sp.linkedin_url} className="flex items-center gap-2 text-sm text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                      <Linkedin className="h-4 w-4" /> LinkedIn
                    </a>
                  ) : null}
                  {sp?.github_url ? (
                    <a href={sp.github_url} className="flex items-center gap-2 text-sm text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                      <Github className="h-4 w-4" /> GitHub
                    </a>
                  ) : null}
                  {resumeHref ? (
                    <a href={resumeHref} className="flex items-center gap-2 text-sm text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                      <FileText className="h-4 w-4" /> Resume
                    </a>
                  ) : null}
                </CardContent>
              </Card>

              <Card id="applied" className="shadow-sm">
                <CardContent className="p-5">
                  <h2 className="mb-3 font-data text-[10px] uppercase tracking-wide text-muted-foreground">Recent applications</h2>
                  {(appliedRes.data || []).length === 0 ? (
                    <p className="font-body text-sm text-muted-foreground">Nothing applied yet. Discover is waiting.</p>
                  ) : (
                    <ul className="space-y-2">
                      {(appliedRes.data || []).map((row: any) => (
                        <li key={row.id} className="flex items-center justify-between gap-2 text-sm">
                          <span className="truncate">
                            {row.jobs?.title || "Role"}
                            <span className="text-muted-foreground">
                              {" "}
                              · {row.jobs?.recruiter_profiles?.company_name || row.jobs?.recruiter_profiles?.[0]?.company_name || ""}
                            </span>
                          </span>
                          <span className="shrink-0 text-xs text-muted-foreground">{formatDate(row.created_at)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              <Card id="saved" className="shadow-sm">
                <CardContent className="space-y-4 p-5">
                  <h2 className="font-data text-[10px] uppercase tracking-wide text-muted-foreground">Saved roles</h2>
                  {savedRows.length === 0 ? (
                    <p className="font-body text-sm text-muted-foreground">No bookmarks. Apply or pass in Discover.</p>
                  ) : (
                    savedRows.map((row: any) => {
                      const job = Array.isArray(row.jobs) ? row.jobs[0] : row.jobs
                      if (!job) return null
                      const company = Array.isArray(job.recruiter_profiles) ? job.recruiter_profiles[0] : job.recruiter_profiles
                      return (
                        <div key={row.id} className="rounded-xl border border-border p-3">
                          <p className="font-heading text-sm font-semibold">{job.title}</p>
                          <p className="text-xs text-muted-foreground">{company?.company_name}</p>
                          <div className="mt-2">
                            <SavedJobActions
                              swipeId={row.id}
                              jobId={job.id}
                              jobTitle={job.title}
                              userId={user.id}
                              isActive={job.is_active}
                            />
                          </div>
                        </div>
                      )
                    })
                  )}
                </CardContent>
              </Card>
            </>
          ) : null}

          {isRecruiter ? (
            <Card className="shadow-sm">
              <CardContent className="space-y-3 p-5">
                <h2 className="font-data text-[10px] uppercase tracking-wide text-muted-foreground">Share a job</h2>
                {(recruiterJobs.data || []).length === 0 ? (
                  <Link href="/jobs/new" className="font-body text-sm text-primary hover:underline">
                    Post your first role
                  </Link>
                ) : (
                  (recruiterJobs.data || []).map((job: any) => (
                    <div key={job.id} className="flex items-center justify-between gap-2">
                      <Link href={`/jobs/${job.id}`} className="truncate font-body text-sm hover:underline">
                        {job.title}
                      </Link>
                      <ShareButton path={`/jobs/${job.id}`} title={job.title} size="sm" label="Share" />
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  )
}
