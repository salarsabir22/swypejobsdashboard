import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn, getInitials } from "@/lib/utils"
import { skillOverlap } from "@/lib/match/fit"
import type { Profile, StudentProfile } from "@/types"
import { PhotoHero } from "@/components/swipe/PhotoHero"
import { CredentialLink } from "@/components/storage/SignedFileLink"

interface CandidateCardProps {
  profile: Profile
  studentProfile: StudentProfile
  className?: string
  reasons?: string[]
  jobSkills?: string[] | null
  applied?: boolean
  onOpenProfile?: () => void
}

export function CandidateCard({
  profile,
  studentProfile,
  className,
  reasons,
  jobSkills,
  applied,
  onOpenProfile,
}: CandidateCardProps) {
  const links = [
    { href: studentProfile.linkedin_url, label: "LinkedIn" },
    { href: studentProfile.github_url, label: "GitHub" },
    { href: studentProfile.portfolio_url, label: "Portfolio" },
    { href: studentProfile.resume_url, label: "Resume" },
  ].filter((l): l is { href: string; label: string } => Boolean(l.href))

  const school = [studentProfile.university, studentProfile.degree].filter(Boolean).join(" · ")
  const matched = skillOverlap(jobSkills, studentProfile.skills)
  const matchedSet = new Set(matched.map((s) => s.toLowerCase()))
  const otherSkills = (studentProfile.skills || []).filter((s) => !matchedSet.has(s.trim().toLowerCase()))
  const shownMatched = matched.slice(0, 5)
  const shownOther = otherSkills.slice(0, Math.max(0, 5 - shownMatched.length))
  const hiddenCount = matched.length + otherSkills.length - shownMatched.length - shownOther.length

  return (
    <div
      className={cn(
        "flex h-auto min-h-0 w-full select-none flex-col overflow-hidden rounded-3xl border border-border bg-card text-card-foreground shadow-lg ring-1 ring-black/[0.04] max-lg:h-full",
        className
      )}
    >
      <PhotoHero
        src={profile.avatar_url}
        fit="contain"
        fallback={
          <span className="font-heading text-4xl font-semibold text-white/80">
            {getInitials(profile.full_name || "?")}
          </span>
        }
      >
        {applied ? (
          <span className="mb-2 inline-flex rounded-full bg-white/15 px-2.5 py-0.5 font-body text-[10px] font-medium uppercase tracking-wide text-white ring-1 ring-white/20">
            Applied
          </span>
        ) : null}
        <h2 className="font-heading text-lg font-semibold leading-snug text-white sm:text-xl">{profile.full_name}</h2>
        {school ? <p className="mt-1 font-body text-sm text-white/85">{school}</p> : null}
        {studentProfile.graduation_year ? (
          <p className="mt-0.5 font-body text-xs text-white/70">Class of {studentProfile.graduation_year}</p>
        ) : null}
        {onOpenProfile ? (
          <button
            type="button"
            className="mt-1 font-body text-xs font-medium text-white/90 underline-offset-2 hover:underline lg:hidden"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              onOpenProfile()
            }}
          >
            View profile
          </button>
        ) : null}
      </PhotoHero>

      <div className="shrink-0 space-y-1.5 p-2 max-lg:py-2 sm:space-y-3 sm:p-4 lg:p-5">
        {profile.bio ? (
          <p className="hidden font-body text-sm leading-relaxed text-muted-foreground lg:line-clamp-4 lg:block">{profile.bio}</p>
        ) : null}

        {reasons && reasons.length > 0 ? (
          <div className="hidden flex-wrap gap-1.5 lg:flex">
            {reasons.map((reason) => (
              <Badge key={reason} variant="outline" className="font-normal text-primary">
                {reason}
              </Badge>
            ))}
          </div>
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

        {links.length > 0 ? (
          <div className="hidden flex-wrap gap-x-3 gap-y-1 lg:flex">
            {links.map(({ href, label }) => (
              <CredentialLink
                key={label}
                href={href}
                label={label}
                className="font-body text-xs font-medium text-primary underline-offset-4 hover:underline"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              />
            ))}
          </div>
        ) : null}

        {onOpenProfile ? (
          <Button
            type="button"
            variant="ghost"
            className="hidden h-8 w-full rounded-full text-xs lg:flex"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              onOpenProfile()
            }}
          >
            Open full profile
          </Button>
        ) : null}
      </div>
    </div>
  )
}
