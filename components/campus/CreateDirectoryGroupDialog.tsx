"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { UsersRound } from "lucide-react"
import {
  suggestDirectoryGroupName,
  summarizeDirectoryFilters,
  type CampusDirectoryFilters,
} from "@/lib/campus/directory"
import {
  suggestEmployerGroupName,
  summarizeEmployerDirectoryFilters,
  type CampusEmployerDirectoryFilters,
} from "@/lib/campus/employer-directory"
import { useToast } from "@/lib/hooks/use-toast"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type GroupKind = "students" | "alumni" | "employers"

export function CreateDirectoryGroupDialog({
  kind,
  totalMatching,
  filters,
  selectedIds,
  canMutate,
}: {
  kind: GroupKind
  totalMatching: number
  filters: CampusDirectoryFilters | CampusEmployerDirectoryFilters
  selectedIds: string[]
  canMutate: boolean
}) {
  const { toast } = useToast()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [mode, setMode] = useState<"filter" | "selection">("filter")

  const isEmployer = kind === "employers"
  const noun = isEmployer ? "employers" : kind === "alumni" ? "alumni" : "students"
  const groupsHref = isEmployer ? "/campus/people/groups?kind=employers" : `/campus/people/groups?kind=${kind}`

  const summary = useMemo(
    () =>
      isEmployer
        ? summarizeEmployerDirectoryFilters(filters as CampusEmployerDirectoryFilters)
        : summarizeDirectoryFilters(filters as CampusDirectoryFilters),
    [filters, isEmployer]
  )
  const suggested = useMemo(
    () =>
      isEmployer
        ? suggestEmployerGroupName(filters as CampusEmployerDirectoryFilters)
        : suggestDirectoryGroupName(filters as CampusDirectoryFilters, kind === "alumni" ? "alumni" : "students"),
    [filters, isEmployer, kind]
  )
  const selectedCount = selectedIds.filter((id) => !id.startsWith("partner:")).length

  useEffect(() => {
    if (!open) return
    setName(suggested)
    setDescription(summary.length ? summary.join(" · ") : "")
    setMode(selectedCount > 0 ? "selection" : "filter")
  }, [open, suggested, summary, selectedCount])

  if (!canMutate) return null

  const memberCount = mode === "selection" ? selectedCount : totalMatching
  const canSubmit = Boolean(name.trim()) && memberCount > 0

  async function createGroup() {
    if (!canSubmit) return
    setBusy(true)
    try {
      const res = await fetch("/api/campus/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          kind,
          mode,
          filters,
          memberIds: mode === "selection" ? selectedIds.filter((id) => !id.startsWith("partner:")) : undefined,
          studentIds: mode === "selection" && !isEmployer ? selectedIds : undefined,
        }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        group?: { id: string; memberCount: number; name: string }
      }
      if (!res.ok) {
        toast({ variant: "destructive", title: data.error || "Could not create group" })
        return
      }
      toast({
        title: "Group created",
        description: `${data.group?.name || name} · ${data.group?.memberCount?.toLocaleString() || memberCount} members`,
      })
      setOpen(false)
      router.push(groupsHref)
      router.refresh()
    } catch (error) {
      toast({
        variant: "destructive",
        title: error instanceof Error ? error.message : "Could not create group",
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" className="rounded-full" disabled={totalMatching === 0 && selectedCount === 0}>
          <UsersRound className="size-3.5" strokeWidth={1.75} />
          Create group
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create directory group</DialogTitle>
          <DialogDescription>
            Save a named cohort from the current {isEmployer ? "employer" : "directory"} view for outreach and follow-ups.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Members</Label>
            <div className="grid gap-2">
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border px-3 py-2.5">
                <input
                  type="radio"
                  name="group-mode"
                  className="mt-1 size-4 accent-primary"
                  checked={mode === "filter"}
                  onChange={() => setMode("filter")}
                  disabled={totalMatching === 0}
                />
                <span>
                  <span className="block text-sm font-medium">All matching current filters</span>
                  <span className="text-[13px] text-muted-foreground">
                    {totalMatching.toLocaleString()} {noun}
                    {summary.length ? ` · ${summary.join(" · ")}` : " · entire directory"}
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border px-3 py-2.5">
                <input
                  type="radio"
                  name="group-mode"
                  className="mt-1 size-4 accent-primary"
                  checked={mode === "selection"}
                  onChange={() => setMode("selection")}
                  disabled={selectedCount === 0}
                />
                <span>
                  <span className="block text-sm font-medium">Selected rows only</span>
                  <span className="text-[13px] text-muted-foreground">
                    {selectedCount > 0
                      ? `${selectedCount.toLocaleString()} selected on this page`
                      : "Select rows in the table first"}
                  </span>
                </span>
              </label>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="group-name">Group name</Label>
            <Input
              id="group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={suggested}
              className="rounded-full"
              maxLength={120}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="group-description">Notes (optional)</Label>
            <Textarea
              id="group-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isEmployer ? "e.g. Fintech partners for spring fair" : "e.g. BBA cohort for spring career fair outreach"}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="ghost" className="rounded-full" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" className="rounded-full" loading={busy} disabled={!canSubmit} onClick={() => void createGroup()}>
            Create · {memberCount.toLocaleString()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
