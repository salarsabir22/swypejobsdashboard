"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Trash2, UsersRound } from "lucide-react"
import type { CampusDirectoryGroup } from "@/lib/campus/groups"
import { useToast } from "@/lib/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export function CampusGroupsList({
  groups,
  canMutate,
}: {
  groups: CampusDirectoryGroup[]
  canMutate: boolean
}) {
  const { toast } = useToast()
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)

  if (!groups.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No groups yet. Open the student directory, apply filters (or select rows), then use Create group.
      </p>
    )
  }

  async function remove(id: string, name: string) {
    setBusyId(id)
    try {
      const res = await fetch("/api/campus/groups", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        toast({ variant: "destructive", title: data.error || "Could not delete group" })
        return
      }
      toast({ title: `Deleted “${name}”` })
      router.refresh()
    } catch (error) {
      toast({
        variant: "destructive",
        title: error instanceof Error ? error.message : "Could not delete group",
      })
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Group</TableHead>
            <TableHead>Members</TableHead>
            <TableHead>Criteria</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map((group) => (
            <TableRow key={group.id}>
              <TableCell className="min-w-[12rem] font-medium">
                <div className="flex items-start gap-2">
                  <UsersRound className="mt-0.5 size-4 text-muted-foreground" strokeWidth={1.75} />
                  <div>
                    <p>{group.name}</p>
                    {group.description ? (
                      <p className="mt-0.5 text-[13px] text-muted-foreground">{group.description}</p>
                    ) : null}
                  </div>
                </div>
              </TableCell>
              <TableCell className="tabular-nums">{group.memberCount.toLocaleString()}</TableCell>
              <TableCell className="max-w-[18rem] text-[13px] text-muted-foreground">
                {group.summary.length ? group.summary.join(" · ") : group.mode === "selection" ? "Manual selection" : "Entire directory"}
              </TableCell>
              <TableCell className="whitespace-nowrap text-[13px] text-muted-foreground">
                {new Date(group.createdAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap justify-end gap-1.5">
                  <Button asChild size="sm" variant="outline" className="h-8 rounded-full px-2.5">
                    <Link href={`/campus/people/groups/${group.id}`}>Open</Link>
                  </Button>
                  {canMutate ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 rounded-full px-2.5 text-destructive"
                      disabled={busyId === group.id}
                      onClick={() => void remove(group.id, group.name)}
                    >
                      <Trash2 className="size-3.5" strokeWidth={1.75} />
                      <span className="sr-only">Delete</span>
                    </Button>
                  ) : null}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
