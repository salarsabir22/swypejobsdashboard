"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, Globe, Pencil, Plus } from "lucide-react"
import { OPPORTUNITY_KIND_LABEL, type CampusOpportunity } from "@/lib/campus/opportunities"
import { deadlineLabel } from "@/lib/jobs/deadline"
import { useToast } from "@/lib/hooks/use-toast"
import { OpportunityForm, type OpportunityDraft } from "@/components/campus/OpportunityForm"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

function toDraft(row: CampusOpportunity): OpportunityDraft {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    country: row.country || "",
    organization: row.organization || "",
    summary: row.summary || "",
    eligibility: row.eligibility || "",
    visaUrl: row.visa_url || "",
    applyUrl: row.apply_url || "",
    deadline: row.deadline ? String(row.deadline).slice(0, 10) : "",
  }
}

export function OpportunityManager({
  opportunities,
  viewCounts,
  canMutate,
}: {
  opportunities: CampusOpportunity[]
  viewCounts: Record<string, number>
  canMutate: boolean
}) {
  const { toast } = useToast()
  const router = useRouter()
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<CampusOpportunity | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const setActive = async (row: CampusOpportunity, isActive: boolean) => {
    setBusyId(row.id)
    const res = await fetch("/api/campus/opportunities", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: row.id, isActive }),
    })
    const body = (await res.json().catch(() => null)) as { error?: string } | null
    setBusyId(null)
    if (!res.ok) {
      toast({ variant: "destructive", title: "Couldn’t update the listing", description: body?.error })
      return
    }
    toast({ title: isActive ? "Listing is live" : "Listing hidden from students" })
    router.refresh()
  }

  return (
    <div className="space-y-4">
      {canMutate ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            Live listings appear on the student International opportunities page. Views count distinct students who opened
            a listing.
          </p>
          <Button type="button" size="sm" className="rounded-full" onClick={() => setCreating((prev) => !prev)}>
            <Plus className="size-4" strokeWidth={1.75} />
            {creating ? "Close" : "New listing"}
          </Button>
        </div>
      ) : null}

      {canMutate && creating ? (
        <div className="rounded-2xl border border-border bg-card p-4">
          <OpportunityForm
            onSaved={() => {
              setCreating(false)
              router.refresh()
            }}
          />
        </div>
      ) : null}

      {!opportunities.length ? (
        <div className="rounded-2xl border border-dashed border-border p-6 text-center">
          <Globe className="mx-auto size-6 text-muted-foreground" strokeWidth={1.75} />
          <p className="mt-2 text-sm font-medium">No listings yet</p>
          <p className="text-sm text-muted-foreground">
            Publish a study abroad, exchange, dual degree, or scholarship program to get started.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[16rem]">Program</TableHead>
                <TableHead>Kind</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Students opened</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {opportunities.map((row) => {
                const live = row.is_active !== false
                return (
                  <TableRow key={row.id}>
                    <TableCell className="min-w-[16rem]">
                      <p className="font-medium">{row.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {[row.organization, row.country].filter(Boolean).join(" · ") || "—"}
                      </p>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {OPPORTUNITY_KIND_LABEL[row.kind] || row.kind}
                    </TableCell>
                    <TableCell>
                      <Badge variant={live ? "secondary" : "outline"}>{live ? "Live" : "Hidden"}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span className="inline-flex items-center gap-1.5">
                        <Eye className="size-3.5 text-muted-foreground" strokeWidth={1.75} />
                        {(viewCounts[row.id] || 0).toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{deadlineLabel(row.deadline) || "No deadline"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap justify-end gap-1.5">
                        {canMutate ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-8 rounded-full px-2.5"
                            onClick={() => setEditing(row)}
                          >
                            <Pencil className="size-3.5" strokeWidth={1.75} />
                            Edit
                          </Button>
                        ) : null}
                        {canMutate ? (
                          <Button
                            type="button"
                            size="sm"
                            variant={live ? "ghost" : "secondary"}
                            className="h-8 rounded-full px-2.5"
                            disabled={busyId === row.id}
                            onClick={() => void setActive(row, !live)}
                          >
                            {live ? "Hide" : "Publish"}
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit listing</DialogTitle>
          </DialogHeader>
          {editing ? (
            <OpportunityForm
              key={editing.id}
              initial={toDraft(editing)}
              onSaved={() => {
                setEditing(null)
                router.refresh()
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
