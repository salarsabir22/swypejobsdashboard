import { Building2 } from "lucide-react"
import type { Job } from "@/types"
import { cn, formatRelativeTime } from "@/lib/utils"
import { skillOverlap } from "@/lib/match/fit"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatSalary } from "@/lib/jobs/salary"
import { PhotoHero } from "@/components/swipe/PhotoHero"

const JOB_TYPE_LABEL: Record<string, string> = {
  internship: "Internship",
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
}

interface JobCardProps {
  job: Job
  className?: string
  onOpenCompany?: () => void
  onOpenListing?: () => void
  reasons?: string[]
  studentSkills?: string[] | null
}

export function JobCard({
  job,
  className,
  onOpenCompany,
  onOpenListing,
  reasons,
  studentSkills,
}: JobCardProps) {
  const company = job.recruiter_profiles
  const typeLabel = JOB_TYPE_LABEL[job.job_type] ?? job.job_type
  const locationOrRemote = job.is_remote ? "Remote" : job.location
  const pay = formatSalary({
    min: job.salary_min,
    max: job.salary_max,
    currency: job.salary_currency,
    note: job.compensation_note,
  })
  const matched = skillOverlap(studentSkills, job.required_skills)
  const matchedSet = new Set(matched.map((s) => s.toLowerCase()))
  const otherSkills = (job.required_skills || []).filter((s) => !matchedSet.has(s.trim().toLowerCase()))
  const shownMatched = matched.slice(0, 6)
  const shownOther = otherSkills.slice(0, Math.max(0, 6 - shownMatched.length))
  const hiddenCount = matched.length + otherSkills.length - shownMatched.length - shownOther.length

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
          {locationOrRemote ? (
            <span className="rounded-full bg-white/10 px-2.5 py-0.5 font-body text-[10px] font-medium text-white/85 ring-1 ring-white/15">
              {locationOrRemote}
            </span>
          ) : null}
        </div>
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
        <p className="mt-1.5 font-body text-sm font-medium text-white/90">
          {pay ? `${pay} · ` : null}
          Posted {formatRelativeTime(job.created_at)}
        </p>
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
          <div className="hidden flex-wrap gap-1.5 lg:flex">
            {reasons.map((reason) => (
              <Badge key={reason} variant="outline" className="font-normal text-primary">
                {reason}
              </Badge>
            ))}
          </div>
        ) : null}

        {job.description ? (
          <p className="hidden font-body text-sm leading-relaxed text-muted-foreground lg:line-clamp-4 lg:block">{job.description}</p>
        ) : null}

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
