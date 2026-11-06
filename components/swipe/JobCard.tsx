import { Building2 } from "lucide-react"
import type { Job } from "@/types"
import { cn, formatRelativeTime } from "@/lib/utils"
import { skillOverlap, jobFitScore } from "@/lib/match/fit"
import { fitEncouragement, isEarlyApplicant, jobRequiresVideo, skillMatchPercent } from "@/lib/jobs/badges"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatSalary } from "@/lib/jobs/salary"
import { deadlineLabel, deadlineSoon } from "@/lib/jobs/deadline"
import { CURATED_BADGE } from "@/lib/jobs/curation"
import { PhotoHero } from "@/components/swipe/PhotoHero"

const JOB_TYPE_LABEL: Record<string, string> = {
  internship: "Internship",
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
  fellowship: "Fellowship",
  freelance: "Freelance",
  project: "Project",
}

interface JobCardProps {
  job: Job & { application_count?: number | null }
  className?: string
  onOpenCompany?: () => void
  onOpenListing?: () => void
  reasons?: string[]
  studentSkills?: string[] | null
  preferredCategories?: string[] | null
  studentLocationHint?: string | null
}

export function JobCard({
  job,
  className,
  onOpenCompany,
  onOpenListing,
  reasons,
  studentSkills,
  preferredCategories,
  studentLocationHint,
}: JobCardProps) {
  const company = Array.isArray(job.recruiter_profiles) ? job.recruiter_profiles[0] : job.recruiter_profiles
  const typeLabel = JOB_TYPE_LABEL[job.job_type] ?? job.job_type
  const locationOrRemote = job.is_remote ? "Remote" : job.location
  const pay = formatSalary({
    min: job.salary_min,
    max: job.salary_max,
    currency: job.salary_currency,
    note: job.compensation_note,
  })
  const team = company?.employee_count
    ? company.employee_count.toLowerCase().includes("team")
      ? company.employee_count
      : `${company.employee_count} team`
    : null
  const cardLine = [pay || "Pay on request", locationOrRemote || "Location TBA", team || "Team size TBA"].join(" · ")
  const matched = skillOverlap(studentSkills, job.required_skills)
  const matchedSet = new Set(matched.map((s) => s.toLowerCase()))
  const otherSkills = (job.required_skills || []).filter((s) => !matchedSet.has(s.trim().toLowerCase()))
  const shownMatched = matched.slice(0, 6)
  const shownOther = otherSkills.slice(0, Math.max(0, 6 - shownMatched.length))
  const hiddenCount = matched.length + otherSkills.length - shownMatched.length - shownOther.length
  const deadlineText = deadlineLabel(job.application_deadline)
  const closingSoon = deadlineSoon(job.application_deadline)
  const requiresVideo = jobRequiresVideo(job)
  const early = isEarlyApplicant(job.application_count)
  const skillPercent = skillMatchPercent(studentSkills, job.required_skills)
  const fitScore = jobFitScore({
    studentSkills,
    preferredCategories,
    jobSkills: job.required_skills,
    jobCategory: job.category,
    jobLocation: job.location,
    studentLocationHint,
    remote: job.is_remote,
    createdAt: job.created_at,
    employerApproved: company?.is_approved,
    employerHasWebsite: Boolean(company?.website_url),
  })
  const encouragement = fitEncouragement({ fitScore, skillPercent })

  return (
    <div
      className={cn(
        "flex h-auto min-h-0 w-full select-none flex-col overflow-hidden rounded-3xl border border-border bg-card text-card-foreground shadow-lg ring-1 ring-black/[0.04] max-lg:h-full",
        className
      )}
    >
      <PhotoHero
        src={company?.logo_url}
        fit="contain"
        fallback={<Building2 className="h-16 w-16 text-white/70" aria-hidden />}
      >
        <div className="mb-2 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-white/15 px-2.5 py-0.5 font-body text-[10px] font-medium uppercase tracking-wide text-white ring-1 ring-white/20">
            {typeLabel}
          </span>
          {job.cdc_curated ? (
            <span className="rounded-full bg-white px-2.5 py-0.5 font-body text-[10px] font-semibold uppercase tracking-wide text-black">
              {job.collection_label || CURATED_BADGE}
            </span>
          ) : null}
          {requiresVideo ? (
            <span className="rounded-full bg-white px-2.5 py-0.5 font-body text-[10px] font-semibold uppercase tracking-wide text-black">
              *Requires video
            </span>
          ) : null}
          {early ? (
            <span className="rounded-full bg-white/15 px-2.5 py-0.5 font-body text-[10px] font-medium uppercase tracking-wide text-white ring-1 ring-white/20">
              Be an early applicant
            </span>
          ) : null}
          {locationOrRemote ? (
            <span className="rounded-full bg-white/10 px-2.5 py-0.5 font-body text-[10px] font-medium text-white/85 ring-1 ring-white/15">
              {locationOrRemote}
            </span>
          ) : null}
          {team ? (
            <span className="rounded-full bg-white/10 px-2.5 py-0.5 font-body text-[10px] font-medium text-white/85 ring-1 ring-white/15">
              {team}
            </span>
          ) : null}
          {deadlineText ? (
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 font-body text-[10px] font-medium ring-1",
                closingSoon ? "bg-white text-black ring-white" : "bg-white/10 text-white/85 ring-white/15"
              )}
            >
              {deadlineText}
            </span>
          ) : null}
        </div>
        {encouragement ? (
          <p className="mb-2 font-body text-xs font-semibold text-white">{encouragement}</p>
        ) : null}
        <h2 className="font-heading text-lg font-semibold leading-snug tracking-tight text-white sm:text-xl">{job.title}</h2>
        {company?.company_name ? (
          onOpenCompany ? (
            <Button
              type="button"
              variant="link"
              className="mt-1 h-auto p-0 font-body text-sm text-white/90"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                onOpenCompany()
              }}
            >
              {company.company_name} →
            </Button>
          ) : (
            <p className="mt-1 font-body text-sm text-white/80">{company.company_name}</p>
          )
        ) : null}
        <p className="mt-1.5 font-body text-sm font-medium text-white">{cardLine}</p>
        <p className="mt-0.5 font-body text-xs text-white/75">Posted {formatRelativeTime(job.created_at)}</p>
        {onOpenListing ? (
          <button
            type="button"
            className="mt-1 font-body text-xs font-medium text-white/90 underline-offset-2 hover:underline lg:hidden"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              onOpenListing()
            }}
          >
            View listing
          </button>
        ) : null}
      </PhotoHero>

      <div className="shrink-0 space-y-1.5 p-2.5 sm:space-y-3 sm:p-4 lg:p-5">
        {reasons && reasons.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {reasons.map((reason) => (
              <Badge key={reason} variant="outline" className="font-normal text-primary">
                {reason}
              </Badge>
            ))}
          </div>
        ) : null}

        {job.description ? (
          <p className="line-clamp-4 font-body text-sm leading-relaxed text-muted-foreground">{job.description}</p>
        ) : (
          <p className="font-body text-sm text-muted-foreground">Open the listing for the full brief.</p>
        )}

        {matched.length + otherSkills.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {shownMatched.slice(0, 4).map((s) => (
              <Badge key={`m-${s}`} className="text-[11px] font-normal">
                {s}
              </Badge>
            ))}
            {shownOther.slice(0, Math.max(0, 4 - shownMatched.slice(0, 4).length)).map((s) => (
              <Badge key={s} variant="secondary" className="text-[11px] font-normal">
                {s}
              </Badge>
            ))}
            {hiddenCount > 0 ? (
              <Badge variant="outline" className="border-transparent text-[11px] font-normal text-muted-foreground">
                +{hiddenCount}
              </Badge>
            ) : null}
          </div>
        ) : null}

        {onOpenListing ? (
          <Button
            type="button"
            variant="ghost"
            className="hidden h-8 w-full rounded-full text-xs lg:flex"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              onOpenListing()
            }}
          >
            Open full listing
          </Button>
        ) : null}
      </div>
    </div>
  )
}
