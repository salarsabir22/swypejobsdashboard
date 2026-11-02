"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/lib/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Collection = { id: string; name: string; description: string | null; is_active: boolean; jobIds: string[] }
type JobOpt = { id: string; title: string; company?: string | null }

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
  const [name, setName] = useState("Internships")
  const [busy, setBusy] = useState(false)

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
    else router.refresh()
  }

  const toggleJob = async (collectionId: string, jobId: string, on: boolean) => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const query = on
      ? supabase.from("job_collection_items").delete().eq("collection_id", collectionId).eq("job_id", jobId)
      : supabase.from("job_collection_items").insert({ collection_id: collectionId, job_id: jobId, added_by: user?.id })
    const { error } = await query
    if (error) toast({ variant: "destructive", title: "Couldn’t update", description: error.message })
    else router.refresh()
  }

  return (
    <div className="space-y-6">
      <form onSubmit={create} className="flex flex-wrap gap-2">
        <Label className="sr-only">Collection name</Label>
        <Input className="max-w-xs" value={name} onChange={(e) => setName(e.target.value)} placeholder="Finance roles" />
        <Button type="submit" className="rounded-full" loading={busy} disabled={!name.trim()}>
          New collection
        </Button>
      </form>
      {!collections.length ? (
        <p className="text-sm text-muted-foreground">
          No collections yet. Create one above, then tap jobs to add the Campus curated badge.
        </p>
      ) : null}
      {collections.map((col) => (
        <div key={col.id} className="space-y-2 rounded-2xl border border-border p-4">
          <p className="font-medium">{col.name}</p>
          <div className="flex flex-wrap gap-2">
            {jobs.map((job) => {
              const on = col.jobIds.includes(job.id)
              return (
                <Button key={job.id} type="button" size="sm" variant={on ? "default" : "outline"} className="max-w-full" onClick={() => void toggleJob(col.id, job.id, on)}>
                  <span className="max-w-[16rem] truncate">{on ? "✓ " : "+ "}{job.title}</span>
                </Button>
              )
            })}
          </div>
          {!jobs.length ? <p className="text-sm text-muted-foreground">No live jobs to curate yet.</p> : null}
        </div>
      ))}
    </div>
  )
}
