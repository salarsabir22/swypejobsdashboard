"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Building2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/lib/hooks/use-toast"
import { applyHref, jobHasMandatoryQuestions } from "@/lib/jobs/screening"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ShowMoreButton, ShowMoreList } from "@/components/ui/show-more-list"

export type PassedJobItem = {
  id: string
  jobId: string
  title: string
  company: string | null
  logoUrl: string | null
  meta: string
  hasMandatoryQuestions: boolean
}

export function PassedJobsList({ items }: { items: PassedJobItem[] }) {
  const router = useRouter()
  const { toast } = useToast()
  const [rows, setRows] = useState(items)
  const [busyId, setBusyId] = useState<string | null>(null)

  const undoAndApply = async (item: PassedJobItem) => {
    setBusyId(item.id)
    const supabase = createClient()
    const { error: delError } = await supabase.from("job_swipes").delete().eq("id", item.id)
    if (delError) {
      toast({ variant: "destructive", title: "Couldn’t undo pass", description: delError.message })
      setBusyId(null)
      return
    }

    if (item.hasMandatoryQuestions) {
      toast({ title: "Pass undone", description: "Complete the application form to apply." })
      setRows((prev) => prev.filter((row) => row.id !== item.id))
      setBusyId(null)
      router.push(applyHref(item.jobId))
      router.refresh()
      return
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setBusyId(null)
      return
    }
    const { error } = await supabase.from("job_swipes").insert({
      student_id: user.id,
      job_id: item.jobId,
      direction: "right",
    })
    if (error) {
      toast({
        variant: "destructive",
        title: "Pass undone, but apply failed",
        description: error.message,
      })
      setRows((prev) => prev.filter((row) => row.id !== item.id))
      setBusyId(null)
      router.refresh()
      return
    }
    toast({ title: "Applied", description: item.title })
    setRows((prev) => prev.filter((row) => row.id !== item.id))
    setBusyId(null)
    router.refresh()
  }

  if (!rows.length) return null

  return (
    <div className="space-y-3">
      <div>
        <h2 className="font-heading text-base font-semibold tracking-tight">Passed / discarded</h2>
        <p className="mt-1 font-body text-sm text-muted-foreground">
          Roles you swiped left on. Undo a mistake and apply without hunting them down again.
        </p>
      </div>
      <ul className="m-0 list-none space-y-2 p-0">
        <ShowMoreList
          items={rows}
          getKey={(item) => item.id}
          initial={4}
          step={4}
          renderItem={(item) => (
            <li>
              <Card>
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted ring-1 ring-border">
                      {item.logoUrl ? (
                        <img src={item.logoUrl} className="h-full w-full object-cover" alt="" />
                      ) : (
                        <Building2 className="h-5 w-5 text-muted-foreground" aria-hidden />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link href={`/jobs/${item.jobId}`} className="truncate font-heading text-sm font-semibold text-foreground hover:underline">
                        {item.title}
                      </Link>
                      {item.company ? <p className="truncate font-body text-xs text-muted-foreground">{item.company}</p> : null}
                      <p className="mt-0.5 font-body text-[11px] text-muted-foreground">{item.meta}</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    className="rounded-full"
                    loading={busyId === item.id}
                    loadingText="Applying…"
                    onClick={() => void undoAndApply(item)}
                  >
                    Undo & apply
                  </Button>
                </CardContent>
              </Card>
            </li>
          )}
          footer={(remaining, showMore) => (
            <li className="pt-1">
              <ShowMoreButton remaining={remaining} onClick={showMore} className="h-10 rounded-full border border-border" />
            </li>
          )}
        />
      </ul>
    </div>
  )
}
