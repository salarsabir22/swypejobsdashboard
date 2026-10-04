"use client"

import Link from "next/link"
import { Card } from "@/components/ui/card"
import { ChevronDown } from "lucide-react"
import { InfoTip } from "./InfoTip"
import { cn } from "@/lib/utils"

export function DiscoverHowItWorks({
  className,
  audience = "student",
}: {
  className?: string
  audience?: "student" | "recruiter"
}) {
  const student = audience === "student"
  return (
    <Card className={cn("overflow-hidden p-0 shadow-sm", className)}>
      <details className="group">
        <summary
          className={cn(
            "flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 font-body text-sm font-semibold tracking-tight text-foreground sm:px-5 sm:py-4",
            "[&::-webkit-details-marker]:hidden"
          )}
        >
          <span className="inline-flex items-center gap-2">
            How this feed works
            <InfoTip
              label="How this feed works"
              className="relative z-10"
            >
              {student
                ? "Apply sends your profile. Chat opens only after they shortlist you. Pass notifies nobody; saved roles live in Saved."
                : "Applicants show first. Shortlist can open chat; pass hides them from this role. Undo reverses the last card if you haven’t started chatting."}
            </InfoTip>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
        </summary>
        <div className="border-t border-border bg-muted/20 px-4 pb-5 pt-4 sm:px-5">
          <div className="grid gap-6 sm:grid-cols-2">
            <section className="space-y-2">
              <p className="font-data text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                What you&apos;re seeing
              </p>
              <p className="font-body text-sm leading-relaxed text-muted-foreground">
                {student
                  ? "Active jobs only, from teams that have passed a basic review. We exclude roles you’ve already swiped on so you don’t duplicate decisions. Cards are ordered by skill and category fit, then recency."
                  : "People who applied to this role show first, then other students ranked by skill overlap. Switch jobs from Role to review a different posting."}
              </p>
            </section>
            <section className="space-y-2">
              <p className="font-data text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {student ? "When you apply" : "When you shortlist"}
              </p>
              <p className="font-body text-sm leading-relaxed text-muted-foreground">
                {student ? (
                  <>
                    The employer can view the profile you’ve built here. Messaging unlocks after a{" "}
                    <span className="font-medium text-foreground">mutual match</span> — see{" "}
                    <Link href="/matches" className="font-medium text-primary underline-offset-4 hover:underline">
                      Applications
                    </Link>
                    .
                  </>
                ) : (
                  <>
                    Shortlisting opens a thread so you can message them. Pass hides them from this role’s deck. Undo
                    reverses the last card if you haven’t started chatting.
                  </>
                )}
              </p>
            </section>
            <section className="space-y-2">
              <p className="font-data text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {student ? "Save & pass" : "Profiles"}
              </p>
              <p className="font-body text-sm leading-relaxed text-muted-foreground">
                {student ? (
                  <>
                    Saved roles live in{" "}
                    <Link href="/saved" className="font-medium text-primary underline-offset-4 hover:underline">
                      Saved
                    </Link>
                    . Pass moves you forward. Open the full listing anytime from the card.
                  </>
                ) : (
                  <>
                    Open the full candidate page for video, resume, and links. Report or block from that page if
                    something’s off.
                  </>
                )}
              </p>
            </section>
            <section className="space-y-2">
              <p className="font-data text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Timing
              </p>
              <p className="font-body text-sm leading-relaxed text-muted-foreground">
                {student
                  ? "Recruiters respond on different schedules. Outcomes surface in Applications and notifications when we have them."
                  : "Students see your shortlist as a match notification. Reply from Messages when you’re ready."}
              </p>
            </section>
          </div>
        </div>
      </details>
    </Card>
  )
}
