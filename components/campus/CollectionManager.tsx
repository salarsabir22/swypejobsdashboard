"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import { JOB_CATEGORIES } from "@/lib/company-options"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/lib/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

type Collection = { id: string; name: string; description: string | null; is_active: boolean; jobIds: string[] }
type JobOpt = {
  id: string
  title: string
  company?: string | null
  jobType: string | null
  category: string | null
  approval: string
}

const ANY = "__any"

const JOB_TYPE_OPTIONS = [
  { value: "internship", label: "Internship" },
  { value: "part_time", label: "Part time" },
  { value: "full_time", label: "Full time" },
  { value: "fellowship", label: "Fellowship" },
  { value: "project", label: "Project" },
] as const

const JOB_TYPE_LABEL: Record<string, string> = {
  internship: "Internship",
  full_time: "Full time",
  part_time: "Part time",
  contract: "Contract",
  fellowship: "Fellowship",
  freelance: "Freelance",
  project: "Project",
}

export function CollectionManager({
  university,
  collections,
  jobs,
}: {
  university: string
  collections: Collection[]
  jobs: JobOpt[]
}) {
  const { toast } = useToast()
  const router = useRouter()
  const [name, setName] = useState("")
  const [busy, setBusy] = useState(false)
  const [query, setQuery] = useState("")
  const [jobType, setJobType] = useState(ANY)
  const [category, setCategory] = useState(ANY)
  // CDC-approved, live jobs are the default view.
  const [approvedOnly, setApprovedOnly] = useState(true)

  const matched = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return jobs.filter((job) => {
      if (approvedOnly && job.approval !== "approved") return false
      if (jobType !== ANY && job.jobType !== jobType) return false
      if (category !== ANY && job.category !== category) return false
      if (!needle) return true
      return job.title.toLowerCase().includes(needle) || (job.company || "").toLowerCase().includes(needle)
    })
  }, [jobs, query, jobType, category, approvedOnly])

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const { error } = await supabase.from("job_collections").insert({
      university,
      name: name.trim(),
      is_active: true,
      created_by: user?.id,
    })
    setBusy(false)
    if (error) toast({ variant: "destructive", title: "Couldn’t create collection", description: error.message })
    else {
      setName("")
      router.refresh()
    }
  }

  const toggleJob = async (collectionId: string, jobId: string, on: boolean) => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const mutation = on
      ? supabase.from("job_collection_items").delete().eq("collection_id", collectionId).eq("job_id", jobId)
      : supabase.from("job_collection_items").insert({ collection_id: collectionId, job_id: jobId, added_by: user?.id })
    const { error } = await mutation
    if (error) toast({ variant: "destructive", title: "Couldn’t update", description: error.message })
    else router.refresh()
  }

  return (
    <div className="space-y-6">
      <form onSubmit={create} className="flex flex-wrap gap-2">
        <Label className="sr-only">Collection name</Label>
        <Input
          className="max-w-xs rounded-full"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Summer 2027 internships"
        />
        <Button type="submit" className="rounded-full" loading={busy} disabled={!name.trim()}>
          New collection
        </Button>
      </form>

      <div className="space-y-2 rounded-2xl border border-border/70 bg-secondary/20 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[12rem] flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search job title or company…"
              className="h-9 rounded-full pl-9"
              aria-label="Search job title or company"
            />
          </div>
          <Select value={jobType} onValueChange={setJobType}>
            <SelectTrigger className="h-9 w-full rounded-full sm:w-[10.5rem]" aria-label="Job type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ANY}>All job types</SelectItem>
              {JOB_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-9 w-full rounded-full sm:w-[11.5rem]" aria-label="Category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value={ANY}>All categories</SelectItem>
              {JOB_CATEGORIES.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            size="sm"
            variant={approvedOnly ? "default" : "outline"}
            className="h-9 rounded-full"
            aria-pressed={approvedOnly}
            onClick={() => setApprovedOnly((value) => !value)}
          >
            {approvedOnly ? "CDC approved only" : "Any approval"}
          </Button>
        </div>
        <p className="text-[12px] text-muted-foreground">
          {matched.length} of {jobs.length} live listings match.{" "}
          {approvedOnly
            ? "Only listings the CDC approved are shown — switch to include listings with no decision yet."
            : "Listing every live job this campus can see, whether or not it has a CDC decision."}
        </p>
      </div>

      {!collections.length ? (
        <p className="text-sm text-muted-foreground">
          No collections yet. Create one above, then pick jobs to give them the Campus curated badge in Discover.
        </p>
      ) : null}

      {collections.map((col) => {
        // Keep already-curated jobs visible so they can be removed even when filtered out.
        const byId = new Map(matched.map((job) => [job.id, job]))
        for (const job of jobs) {
          if (col.jobIds.includes(job.id) && !byId.has(job.id)) byId.set(job.id, job)
        }
        const options = [...byId.values()]

        return (
          <div key={col.id} className="space-y-3 rounded-2xl border border-border p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-medium">{col.name}</p>
              <p className="text-[12px] text-muted-foreground">{col.jobIds.length} curated</p>
            </div>
            {!options.length ? (
              <p className="text-sm text-muted-foreground">No live job matches these filters.</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {options.map((job) => {
                  const on = col.jobIds.includes(job.id)
                  return (
                    <button
                      key={job.id}
                      type="button"
                      onClick={() => void toggleJob(col.id, job.id, on)}
                      aria-pressed={on}
                      className={cn(
                        "flex w-full flex-col items-start gap-1 rounded-2xl border p-3 text-left transition-colors",
                        on ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                      )}
                    >
                      <span className="flex w-full items-start justify-between gap-2">
                        <span className="text-[14px] font-medium leading-snug">{job.title}</span>
                        <Badge variant={on ? "default" : "secondary"} className="shrink-0 text-[10px]">
                          {on ? "Curated" : "Add"}
                        </Badge>
                      </span>
                      <span className="text-[12px] text-muted-foreground">
                        {[
                          job.company,
                          job.jobType ? JOB_TYPE_LABEL[job.jobType] || job.jobType : null,
                          job.category,
                          job.approval === "approved" ? null : "No CDC decision yet",
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
