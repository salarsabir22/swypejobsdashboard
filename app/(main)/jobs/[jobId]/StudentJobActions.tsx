"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/lib/hooks/use-toast"
import { Bookmark, X, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { applyHref, jobHasMandatoryQuestions } from "@/lib/jobs/screening"
import { useRouter } from "next/navigation"

type Direction = "right" | "left" | "saved"

export function StudentJobActions({
  userId,
  jobId,
  jobTitle,
  screeningQuestions,
}: {
  userId: string
  jobId: string
  jobTitle: string
  screeningQuestions?: unknown
}) {
  const router = useRouter()
  const { toast } = useToast()
  const needsApplyForm = jobHasMandatoryQuestions({ screening_questions: screeningQuestions })
  const [direction, setDirection] = useState<Direction | null>(null)
  const [loadingState, setLoadingState] = useState<"idle" | "fetch" | "act">("fetch")

  const loadSwipe = useCallback(async () => {
    setLoadingState("fetch")
    const supabase = createClient()
    const { data } = await supabase
      .from("job_swipes")
      .select("direction")
      .eq("student_id", userId)
      .eq("job_id", jobId)
      .maybeSingle()
    const d = data?.direction as Direction | undefined
    setDirection(d ?? null)
    setLoadingState("idle")
  }, [userId, jobId])

  useEffect(() => {
    void loadSwipe()
  }, [loadSwipe])

  const act = async (next: Direction) => {
    if (next === "right" && needsApplyForm) {
      router.push(applyHref(jobId))
      return
    }
    setLoadingState("act")
    const supabase = createClient()
    const { error } = await supabase.from("job_swipes").insert({
      student_id: userId,
      job_id: jobId,
      direction: next,
    })
    if (error) {
      const dup = error.message.toLowerCase().includes("duplicate") || error.code === "23505"
      toast({
        variant: "destructive",
        title: "Could not save",
        description: dup ? "You already responded to this role." : error.message,
      })
      setLoadingState("idle")
      void loadSwipe()
      return
    }
    setDirection(next)
    if (next === "right") {
      toast({ title: "Applied", description: jobTitle })
    } else if (next === "saved") {
      toast({ title: "Saved for later" })
    }
    setLoadingState("idle")
  }

  if (loadingState === "fetch") {
    return (
      <div className="space-y-4" role="status" aria-label="Loading your status">
        <Skeleton className="h-4 w-48" />
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
          <Skeleton className="h-12 flex-1 rounded-xl" />
          <Skeleton className="h-12 flex-1 rounded-xl" />
          <Skeleton className="h-12 flex-1 rounded-xl" />
        </div>
      </div>
    )
  }

  if (direction === "right") {
    return (
      <Card className="border-primary/20 bg-muted/30 shadow-none">
        <CardContent className="space-y-3 p-5">
          <CardDescription className="text-foreground/90">
            You have applied to this role. Recruiters see your profile when they review applicants.
          </CardDescription>
          <Button variant="link" className="h-auto p-0 text-primary" asChild>
            <Link href="/matches">View applications</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (direction === "saved") {
    return (
      <Card className="border-border bg-muted/30 shadow-none">
        <CardContent className="space-y-3 p-5">
          <CardDescription className="text-foreground/90">
            Saved for later. Find it from Discover or your dashboard.
          </CardDescription>
          <Button variant="link" className="h-auto p-0 text-primary" asChild>
            <Link href="/discover">Back to Discover</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (direction === "left") {
    return (
      <Card className="shadow-sm">
        <CardContent className="space-y-4 p-5">
          <p className="font-body text-sm text-muted-foreground">You passed on this listing.</p>
          <Button className="rounded-full" asChild>
            <Link href="/discover">Discover more roles</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const busy = loadingState === "act"

  return (
    <div className="space-y-4">
      <p className="font-body text-sm text-muted-foreground">Apply, save for later, or pass.</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
        <Button
          type="button"
          variant="outline"
          className="h-12 flex-1 gap-2 rounded-xl"
          disabled={busy}
          onClick={() => void act("left")}
        >
          <X className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
          Pass
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="h-12 flex-1 gap-2 rounded-xl"
          disabled={busy}
          onClick={() => void act("saved")}
        >
          <Bookmark className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
          Save
        </Button>
        <Button type="button" className="h-12 flex-1 gap-2 rounded-xl" disabled={busy} onClick={() => void act("right")}>
          <Check className="h-4 w-4 shrink-0" strokeWidth={2.25} aria-hidden />
          Apply
        </Button>
      </div>
    </div>
  )
}
