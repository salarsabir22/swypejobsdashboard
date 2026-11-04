"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Bookmark, Heart, Plane, Sparkles, X } from "lucide-react"
import { formatRelativeTime, getInitials } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type StudentHomeJob = {
  id: string
  title: string
  description: string | null
  job_type: string | null
  category: string | null
  location: string | null
  is_remote: boolean | null
  created_at: string
  company: string | null
  logo: string | null
}

const TABS = [
  { id: "discover", label: "Discover", icon: Sparkles },
  { id: "saved", label: "Saved jobs", icon: Bookmark },
  { id: "applied", label: "Applied", icon: Plane },
  { id: "recommended", label: "Recommended for you", icon: Sparkles },
] as const

type TabId = (typeof TABS)[number]["id"]

const TYPE_LABEL: Record<string, string> = {
  internship: "Internship",
  full_time: "Full-time",
  part_time: "Part-time",
  contract: "Contract",
}

export function StudentHomeDeck({
  discover,
  saved,
  applied,
  recommended,
}: {
  discover: StudentHomeJob[]
  saved: StudentHomeJob[]
  applied: StudentHomeJob[]
  recommended: StudentHomeJob[]
}) {
  const [tab, setTab] = useState<TabId>("discover")
  const [index, setIndex] = useState(0)

  const jobs = useMemo(() => {
    if (tab === "saved") return saved
    if (tab === "applied") return applied
    if (tab === "recommended") return recommended
    return discover
  }, [applied, discover, recommended, saved, tab])

  const current = jobs[Math.min(index, Math.max(jobs.length - 1, 0))]
  const behind = jobs.slice(index + 1, index + 3)

  return (
    <section className="rounded-[28px] border border-border/70 bg-card/80 p-4 shadow-[0_18px_40px_-28px_rgba(90,72,255,0.45)] sm:p-5">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Job lists">
        {TABS.map((item) => {
          const selected = tab === item.id
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => {
                setTab(item.id)
                setIndex(0)
              }}
              className={cn(
                "inline-flex min-h-11 items-center gap-2 rounded-full border px-3.5 text-[13px] font-medium",
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-secondary"
              )}
            >
              <item.icon className="h-3.5 w-3.5" aria-hidden />
              {item.label}
            </button>
          )
        })}
      </div>

      <div className="relative mx-auto mt-6 min-h-[360px] max-w-lg">
        {!current ? (
          <div className="flex min-h-[360px] flex-col items-center justify-center rounded-3xl border border-dashed border-border px-6 text-center">
            <p className="font-heading text-lg font-semibold">Nothing here yet</p>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              {tab === "saved"
                ? "Save a role on Discover to compare it later."
                : tab === "applied"
                  ? "A right swipe is your application. Open Discover to start."
                  : "When roles match your campus and skills, they show up here."}
            </p>
            <Button asChild className="mt-4 rounded-full">
              <Link href="/discover">Open Discover</Link>
            </Button>
          </div>
        ) : (
          <>
            {behind.map((job, i) => (
              <article
                key={job.id}
                aria-hidden
                className="absolute inset-x-4 top-4 overflow-hidden rounded-3xl border border-border bg-card shadow-sm"
                style={{ transform: `translateY(${(i + 1) * 10}px) scale(${1 - (i + 1) * 0.04})`, zIndex: 2 - i }}
              >
                <div className="h-28 bg-secondary/70" />
                <div className="p-5">
                  <p className="text-sm text-muted-foreground">{job.company || "Employer"}</p>
                  <p className="font-heading text-xl font-semibold">{job.title}</p>
                </div>
              </article>
            ))}
            <article className="relative z-10 overflow-hidden rounded-3xl border border-border bg-card shadow-[0_22px_48px_-28px_rgba(5,28,44,0.35)]">
              <div className="relative h-40 bg-gradient-to-br from-[#051C2C] to-[#2251FF]">
                {current.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={current.logo} alt="" className="h-full w-full object-cover opacity-80" />
                ) : (
                  <div className="flex h-full items-end p-5">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-lg font-semibold text-[#051C2C]">
                      {getInitials(current.company || current.title)}
                    </span>
                  </div>
                )}
              </div>
              <div className="space-y-3 p-5">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {current.company || "Employer"}
                    {current.is_remote ? " · Remote" : current.location ? ` · ${current.location}` : ""}
                  </p>
                  <h2 className="mt-1 font-heading text-2xl font-semibold tracking-tight">{current.title}</h2>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[TYPE_LABEL[current.job_type || ""] || current.job_type, current.category, current.is_remote ? "Remote" : current.location]
                    .filter(Boolean)
                    .map((tag) => (
                      <span key={tag} className="rounded-full bg-secondary px-2.5 py-1 text-[12px] text-muted-foreground">
                        {tag}
                      </span>
                    ))}
                </div>
                {current.description ? (
                  <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{current.description}</p>
                ) : null}
                <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
                  <span>{formatRelativeTime(current.created_at)}</span>
                  <Link href={`/jobs/${current.id}`} className="font-medium text-primary hover:underline">
                    View details
                  </Link>
                </div>
              </div>
            </article>
            <div className="relative z-10 mt-5 flex items-center justify-center gap-4">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-12 w-12 rounded-full"
                aria-label="Pass"
                onClick={() => setIndex((value) => Math.min(value + 1, Math.max(jobs.length - 1, 0)))}
              >
                <X className="h-5 w-5" />
              </Button>
              <Button asChild size="icon" className="h-12 w-12 rounded-full">
                <Link href="/discover" aria-label="Save or apply on Discover">
                  <Heart className="h-5 w-5" />
                </Link>
              </Button>
            </div>
            {jobs.length > 1 ? (
              <div className="mt-4 flex justify-center gap-1.5" aria-hidden>
                {jobs.slice(0, 6).map((job, i) => (
                  <span
                    key={job.id}
                    className={cn("h-1.5 w-1.5 rounded-full", i === Math.min(index, 5) ? "bg-primary" : "bg-border")}
                  />
                ))}
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  )
}
