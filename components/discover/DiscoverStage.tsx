"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { skillOverlap } from "@/lib/match/fit"
import { formatSalary } from "@/lib/jobs/salary"
import { cn, formatRelativeTime } from "@/lib/utils"
import type { Job, Profile, StudentProfile } from "@/types"
import { DiscoverHowItWorks } from "./DiscoverHowItWorks"
import { CredentialLink } from "@/components/storage/SignedFileLink"

export function DiscoverStage({
  chrome,
  hint,
  board,
  rail,
  className,
}: {
  chrome: ReactNode
  hint?: ReactNode
  board: ReactNode
  rail: ReactNode
  className?: string
}) {
  return (
    <div className={cn("mx-auto flex h-full min-h-0 w-full max-w-[1180px] flex-1 flex-col gap-2 overflow-hidden lg:h-auto lg:min-h-0 lg:flex-none lg:gap-6 lg:overflow-visible", className)}>
      <div className="shrink-0">{chrome}</div>
      {hint ? <div className="hidden shrink-0 lg:block">{hint}</div> : null}
      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] lg:grid-cols-[minmax(0,34rem)_minmax(0,1fr)] lg:grid-rows-none lg:items-start lg:gap-8 xl:grid-cols-[minmax(0,38rem)_minmax(0,1fr)] xl:gap-10">
        <div className="flex h-full min-h-0 flex-col items-stretch gap-2 overflow-hidden lg:h-auto lg:overflow-visible lg:gap-4">{board}</div>
        <aside className="hidden min-w-0 lg:sticky lg:top-24 lg:block">{rail}</aside>
      </div>
    </div>
  )
}

export function DiscoverKeysHint({ children }: { children: ReactNode }) {
  return <p className="hidden text-center font-data text-[10px] uppercase tracking-wide text-muted-foreground lg:block">{children}</p>
}

function RailShell({ children }: { children: ReactNode }) {
  return <div className="space-y-4">{children}</div>
}

export function DiscoverJobRail({
  job,
  reasons,
  studentSkills,
  remaining,
}: {
  job: Job
  reasons: string[]
  studentSkills?: string[] | null
  remaining: number
}) {
  const company = job.recruiter_profiles
  const pay = formatSalary({
    min: job.salary_min,
    max: job.salary_max,
    currency: job.salary_currency,
    note: job.compensation_note,
  })
  const matched = skillOverlap(studentSkills, job.required_skills)
  const matchedSet = new Set(matched.map((s) => s.toLowerCase()))
  const otherSkills = (job.required_skills || []).filter((s) => !matchedSet.has(s.trim().toLowerCase()))

  return (
    <RailShell>
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="space-y-1">
            <p className="font-data text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">This role</p>
            <h2 className="font-heading text-xl font-semibold tracking-tight">{job.title}</h2>
            <p className="font-body text-sm text-muted-foreground">
              {[company?.company_name, job.is_remote ? "Remote" : job.location, pay].filter(Boolean).join(" · ")}
            </p>
            <p className="font-body text-xs text-muted-foreground">
              Posted {formatRelativeTime(job.created_at)}
              {remaining ? ` · ${remaining} left in this stack` : ""}
            </p>
          </div>

          {reasons.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {reasons.map((reason) => (
                <Badge key={reason} variant="outline" className="font-normal text-primary">
                  {reason}
                </Badge>
              ))}
            </div>
          ) : null}

          {job.description ? (
            <p className="max-h-40 overflow-y-auto font-body text-sm leading-relaxed text-muted-foreground">
              {job.description}
            </p>
          ) : (
            <p className="font-body text-sm text-muted-foreground">No description yet. Open the listing for requirements.</p>
          )}

          {matched.length + otherSkills.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {matched.map((s) => (
                <Badge key={`m-${s}`} className="text-[11px] font-normal">
                  {s}
                </Badge>
              ))}
              {otherSkills.slice(0, 10).map((s) => (
                <Badge key={s} variant="secondary" className="text-[11px] font-normal">
                  {s}
                </Badge>
              ))}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2 pt-1">
            <Button asChild className="rounded-full">
              <Link href={`/jobs/${job.id}`}>Open listing</Link>
            </Button>
            {job.recruiter_id ? (
              <Button asChild variant="outline" className="rounded-full">
                <Link href={`/company/${job.recruiter_id}`}>Company</Link>
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
      <DiscoverHowItWorks audience="student" />
    </RailShell>
  )
}

export function DiscoverCandidateRail({
  profile,
  studentProfile,
  reasons,
  jobSkills,
  applied,
  jobId,
  remaining,
}: {
  profile: Profile
  studentProfile: StudentProfile
  reasons: string[]
  jobSkills?: string[] | null
  applied?: boolean
  jobId: string
  remaining: number
}) {
  const school = [studentProfile.university, studentProfile.degree].filter(Boolean).join(" · ")
  const matched = skillOverlap(jobSkills, studentProfile.skills)
  const matchedSet = new Set(matched.map((s) => s.toLowerCase()))
  const otherSkills = (studentProfile.skills || []).filter((s) => !matchedSet.has(s.trim().toLowerCase()))
  const links = [
    { href: studentProfile.linkedin_url, label: "LinkedIn" },
    { href: studentProfile.github_url, label: "GitHub" },
    { href: studentProfile.portfolio_url, label: "Portfolio" },
    { href: studentProfile.resume_url, label: "Resume" },
  ].filter((l): l is { href: string; label: string } => Boolean(l.href))

  return (
    <RailShell>
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="space-y-1">
            <p className="font-data text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              {applied ? "Applied to this role" : "Candidate"}
            </p>
            <h2 className="font-heading text-xl font-semibold tracking-tight">{profile.full_name}</h2>
            <p className="font-body text-sm text-muted-foreground">
              {[school, studentProfile.graduation_year ? `Class of ${studentProfile.graduation_year}` : null]
                .filter(Boolean)
                .join(" · ")}
            </p>
            <p className="font-body text-xs text-muted-foreground">{remaining ? `${remaining} left in this stack` : "Last card in this stack"}</p>
          </div>

          {reasons.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {reasons.map((reason) => (
                <Badge key={reason} variant="outline" className="font-normal text-primary">
                  {reason}
                </Badge>
              ))}
            </div>
          ) : null}

          {profile.bio ? (
            <p className="max-h-40 overflow-y-auto font-body text-sm leading-relaxed text-muted-foreground">{profile.bio}</p>
          ) : (
            <p className="font-body text-sm text-muted-foreground">No bio yet. Open the profile for links and resume.</p>
          )}

          {matched.length + otherSkills.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {matched.map((s) => (
                <Badge key={`m-${s}`} className="text-[11px] font-normal">
                  {s}
                </Badge>
              ))}
              {otherSkills.slice(0, 10).map((s) => (
                <Badge key={s} variant="secondary" className="text-[11px] font-normal">
                  {s}
                </Badge>
              ))}
            </div>
          ) : null}

          {links.length > 0 ? (
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              {links.map(({ href, label }) => (
                <CredentialLink
                  key={label}
                  href={href}
                  label={label}
                  className="font-body text-xs font-medium text-primary underline-offset-4 hover:underline"
                />
              ))}
            </div>
          ) : null}

          <Button asChild className="rounded-full">
            <Link href={`/candidates/${profile.id}?job=${jobId}`}>Open full profile</Link>
          </Button>
        </CardContent>
      </Card>
      <DiscoverHowItWorks audience="recruiter" />
    </RailShell>
  )
}
