/* eslint-disable @typescript-eslint/no-explicit-any */
import React from "react"
import { redirect } from "next/navigation"
import { getRequestUser } from "@/lib/nav/app-shell-user"
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
import { currentRole, formatWorkDates, parseCareerHistory } from "@/lib/profile/career"
import { studentIsAlumni } from "@/lib/jobs/targeting"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ProfilePosts } from "@/components/feed/ProfilePosts"
import { profileSharePath } from "@/lib/share/profile-path"
import { signedStorageUrl } from "@/lib/storage/signed-url"
import { RecruiterIntegrationsCard } from "@/components/hiring/RecruiterIntegrationsCard"
import { EmailPreferencesCard } from "@/components/profile/EmailPreferencesCard"
import { MatchPreferencesCard } from "@/components/profile/MatchPreferencesCard"
import type { UserRole } from "@/types"

export default async function ProfilePage() {
  const { supabase, user } = await getRequestUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
  const isStudent = profile?.role === "student"
  const isRecruiter = profile?.role === "recruiter"

  const [
    studentRes,
    recruiterRes,
    matchCountRes,
    activityCountRes,
    savedRes,
    appliedRes,
    recruiterJobs,
    postsCountRes,
  ] = await Promise.all([
    isStudent
      ? supabase.from("student_profiles").select("*").eq("id", user.id).maybeSingle()
      : Promise.resolve({ data: null as any }),
    isRecruiter
      ? supabase.from("recruiter_profiles").select("*").eq("id", user.id).maybeSingle()
      : Promise.resolve({ data: null as any }),
    supabase
      .from("matches")
      .select("*", { count: "exact", head: true })
      .or(`student_id.eq.${user.id},recruiter_id.eq.${user.id}`),
    isStudent
      ? supabase
          .from("job_swipes")
          .select("*", { count: "exact", head: true })
          .eq("student_id", user.id)
          .eq("direction", "right")
      : supabase.from("jobs").select("*", { count: "exact", head: true }).eq("recruiter_id", user.id),
    isStudent
      ? supabase
          .from("job_swipes")
          .select(
            "id, created_at, job_id, jobs(id, title, is_active, job_type, location, is_remote, recruiter_profiles(company_name, logo_url))",
          )
          .eq("student_id", user.id)
          .eq("direction", "saved")
          .order("created_at", { ascending: false })
          .limit(40)
      : Promise.resolve({ data: [] as any[] }),
    isStudent
      ? supabase
          .from("job_swipes")
          .select("id, created_at, jobs(title, recruiter_profiles(company_name))")
          .eq("student_id", user.id)
          .eq("direction", "right")
          .order("created_at", { ascending: false })
          .limit(8)
      : Promise.resolve({ data: [] as any[] }),
    isRecruiter
      ? supabase
          .from("jobs")
          .select("id, title, is_active")
          .eq("recruiter_id", user.id)
          .order("created_at", { ascending: false })
          .limit(40)
      : Promise.resolve({ data: [] as any[] }),
    supabase.from("feed_posts").select("id", { count: "exact", head: true }).eq("author_id", user.id),
  ])

  const studentProfile = studentRes.data
  const recruiterProfile = recruiterRes.data
  const matchCount = matchCountRes.count
  const activityCount = activityCountRes.count
  const postCount = postsCountRes.error ? 0 : postsCountRes.count ?? 0

  const savedRows = savedRes.data || []
  const rp = recruiterProfile as any
  const sp = studentProfile as any
  const resumeHref = sp?.resume_url
    ? await signedStorageUrl(supabase, "resumes", sp.resume_url)
    : null
  const career = parseCareerHistory(sp)
  const alumni = isStudent && studentIsAlumni(sp)
  const nowRole = currentRole(career.work)
  const completeness = isStudent
    ? studentCompleteness({
        avatar: profile?.avatar_url,
        bio: profile?.bio,
        university: sp?.university,
        skills: sp?.skills,
        resume: sp?.resume_url,
        video: profile?.profile_video_url,
        linkedin: sp?.linkedin_url,
        experience: career.work.length > 0,
        projects: career.projects.length > 0,
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
    : alumni && nowRole
      ? [nowRole.position, nowRole.name].filter(Boolean).join(" at ")
      : [sp?.degree, sp?.university].filter(Boolean).join(" · ") || (alumni ? "Alumni" : "Student")
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
            {isStudent ? (
              <Button asChild variant="outline" size="sm" className="rounded-full">
                <Link href="/resume">
                  <FileText className="h-4 w-4" />
                  Resume
                </Link>
              </Button>
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

          {isStudent ? (
            <MatchPreferencesCard userId={user.id} gender={sp?.gender} department={sp?.department} locations={sp?.preferred_locations} />
          ) : null}

          {isStudent || isRecruiter ? (
            <EmailPreferencesCard
              userId={user.id}
              enabled={profile?.email_notifications !== false}
              role={isStudent ? "student" : "recruiter"}
            />
          ) : null}

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
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h2 className="font-data text-[10px] uppercase tracking-wide text-muted-foreground">Education</h2>
                    {alumni ? (
                      <div className="flex flex-wrap gap-1.5">
                        <Badge className="font-normal">Alumni</Badge>
                        {sp?.mentorship_opt_in ? (
                          <Badge variant="outline" className="font-normal">
                            Mentor
                          </Badge>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  {sp?.university ? (
                    <div>
                      <p className="flex items-center gap-1.5 font-heading font-semibold">
                        <GraduationCap className="h-4 w-4 text-muted-foreground" />
                        {sp.university}
                      </p>
                      {sp.college ? <p className="mt-1 font-body text-sm text-muted-foreground">{sp.college}</p> : null}
                      {sp.degree ? <p className="mt-1 font-body text-sm text-muted-foreground">{sp.degree}</p> : null}
                      {sp.campus_student_id ? (
                        <p className="mt-1 font-data text-xs text-muted-foreground">ID {sp.campus_student_id}</p>
                      ) : null}
                      {sp.graduation_year ? (
                        <p className="mt-1 flex items-center gap-1 font-body text-xs text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" />
                          Class of {sp.graduation_year}
                        </p>
                      ) : null}
                      {alumni ? (
                        <div className="mt-3 rounded-xl border border-border bg-muted/30 p-3">
                          <p className="font-data text-[10px] uppercase tracking-wide text-muted-foreground">Currently</p>
                          {nowRole ? (
                            <>
                              <p className="mt-1 font-heading text-sm font-semibold">
                                {nowRole.position}
                                <span className="font-normal text-muted-foreground"> · {nowRole.name}</span>
                              </p>
                              {formatWorkDates(nowRole) ? (
                                <p className="mt-0.5 font-body text-xs text-muted-foreground">{formatWorkDates(nowRole)}</p>
                              ) : null}
                            </>
                          ) : (
                            <p className="mt-1 font-body text-sm text-muted-foreground">
                              No current employer set.{" "}
                              <Link href="/profile/experience" className="text-primary hover:underline">
                                Add your current role
                              </Link>
                            </p>
                          )}
                          <p className="mt-2 font-body text-xs">
                            <Link href="/profile/survey" className="text-primary hover:underline">
                              {nowRole ? "Update your career survey" : "Fill in your career survey"}
                            </Link>
                          </p>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <Link href="/onboarding" className="font-body text-sm text-primary hover:underline">
                      Add your university
                    </Link>
                  )}
                </CardContent>
              </Card>

              <Card id="experience" className="shadow-sm">
                <CardContent className="p-5">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h2 className="font-data text-[10px] uppercase tracking-wide text-muted-foreground">Experience</h2>
                    <span className="flex gap-3">
                      <Link href="/profile/education" className="font-body text-xs text-primary hover:underline">Degrees</Link>
                      <Link href="/profile/experience" className="font-body text-xs text-primary hover:underline">
                        {career.work.length || career.projects.length || career.certifications.length ? "Edit" : "Add"}
                      </Link>
                    </span>
                  </div>
                  {career.work.length === 0 && career.projects.length === 0 && career.certifications.length === 0 ? (
                    <p className="font-body text-sm text-muted-foreground">
                      Add internships, jobs, projects, and certifications so employers can see what you’ve done.
                    </p>
                  ) : (
                    <div className="space-y-5">
                      {career.work.length ? (
                        <ul className="space-y-3">
                          {career.work.map((w) => (
                            <li key={w.id}>
                              <p className="font-heading text-sm font-semibold">
                                {w.position}
                                <span className="font-normal text-muted-foreground"> · {w.name}</span>
                              </p>
                              <p className="mt-0.5 font-body text-xs text-muted-foreground">
                                {w.kind === "internship" ? "Internship" : "Job"}
                                {formatWorkDates(w) ? ` · ${formatWorkDates(w)}` : ""}
                              </p>
                              {w.summary ? <p className="mt-1 font-body text-sm text-foreground/90">{w.summary}</p> : null}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      {career.projects.length ? (
                        <div>
                          <p className="mb-2 font-data text-[10px] uppercase tracking-wide text-muted-foreground">Projects</p>
                          <ul className="space-y-2">
                            {career.projects.map((p) => (
                              <li key={p.id}>
                                {p.url ? (
                                  <a href={p.url} target="_blank" rel="noopener noreferrer" className="font-heading text-sm font-semibold text-primary hover:underline">
                                    {p.name}
                                  </a>
                                ) : (
                                  <p className="font-heading text-sm font-semibold">{p.name}</p>
                                )}
                                {p.description ? <p className="font-body text-sm text-muted-foreground">{p.description}</p> : null}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      {career.certifications.length ? (
                        <div>
                          <p className="mb-2 font-data text-[10px] uppercase tracking-wide text-muted-foreground">Certifications</p>
                          <div className="flex flex-wrap gap-2">
                            {career.certifications.map((c) => (
                              <Badge key={c.id} variant="outline" className="font-normal">
                                {c.name}
                                {c.issuer ? <span className="text-muted-foreground"> · {c.issuer}</span> : null}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
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
                      <FileText className="h-4 w-4" /> Resume (PDF)
                    </a>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button asChild variant="outline" size="sm" className="rounded-full">
                      <Link href="/resume">
                        <Edit className="h-4 w-4" />
                        {resumeHref ? "Edit resume" : "Build resume"}
                      </Link>
                    </Button>
                    <Button asChild variant="ghost" size="sm" className="rounded-full">
                      <Link href="/resume">Download PDF or Word</Link>
                    </Button>
                  </div>
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
