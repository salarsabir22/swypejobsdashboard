"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { GraduationCap, MessageSquare, ShieldOff } from "lucide-react"
import type { CampusDirectoryFilters, CampusDirectoryStudent } from "@/lib/campus/directory"
import { useToast } from "@/lib/hooks/use-toast"
import { CreateDirectoryGroupDialog } from "@/components/campus/CreateDirectoryGroupDialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"

const SUSPEND_REASONS = [
  { id: "left_campus", label: "No longer studying at this campus" },
  { id: "inactivity", label: "Prolonged inactivity with career services" },
  { id: "policy", label: "Career center policy / partnership issue" },
  { id: "other", label: "Other / custom" },
] as const

export function StudentDirectory({
  students,
  kind,
  canMutate,
  totalMatching = 0,
  filters = {},
}: {
  students: CampusDirectoryStudent[]
  kind: "students" | "alumni"
  canMutate: boolean
  totalMatching?: number
  filters?: CampusDirectoryFilters
}) {
  const { toast } = useToast()
  const router = useRouter()
  const [suspendTarget, setSuspendTarget] = useState<CampusDirectoryStudent | null>(null)
  const [graduateTarget, setGraduateTarget] = useState<CampusDirectoryStudent | null>(null)
  const [messageTarget, setMessageTarget] = useState<CampusDirectoryStudent | null>(null)
  const [busy, setBusy] = useState(false)
  const [selected, setSelected] = useState<Record<string, boolean>>({})

  const [suspendReason, setSuspendReason] = useState<string>("left_campus")
  const [suspendMessage, setSuspendMessage] = useState("")
  const [gradYear, setGradYear] = useState("")
  const [gradProgram, setGradProgram] = useState("")
  const [gradNotes, setGradNotes] = useState("")
  const [messageTitle, setMessageTitle] = useState("Message from IoBM CDC")
  const [messageBody, setMessageBody] = useState("")

  const yearOptions = useMemo(() => {
    const y = new Date().getFullYear()
    return Array.from({ length: 12 }, (_, i) => String(y - 6 + i))
  }, [])

  const selectedIds = useMemo(
    () => students.filter((row) => selected[row.id]).map((row) => row.id),
    [students, selected]
  )
  const allPageSelected = students.length > 0 && students.every((row) => selected[row.id])
  const somePageSelected = students.some((row) => selected[row.id])

  const toggleAllPage = (checked: boolean) => {
    setSelected((prev) => {
      const next = { ...prev }
      for (const row of students) {
        if (checked) next[row.id] = true
        else delete next[row.id]
      }
      return next
    })
  }

  const openSuspend = (row: CampusDirectoryStudent) => {
    setSuspendTarget(row)
    setSuspendReason("left_campus")
    setSuspendMessage("")
  }

  const openGraduate = (row: CampusDirectoryStudent) => {
    setGraduateTarget(row)
    setGradYear(row.classYear ? String(row.classYear) : String(new Date().getFullYear()))
    setGradProgram(row.program || "")
    setGradNotes("")
  }

  const openMessage = (row: CampusDirectoryStudent) => {
    setMessageTarget(row)
    setMessageTitle("Message from IoBM CDC")
    setMessageBody("")
  }

  const post = async (payload: Record<string, unknown>, success: string) => {
    setBusy(true)
    try {
      const res = await fetch("/api/campus/people", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        toast({ variant: "destructive", title: data.error || "Could not update student" })
        return false
      }
      toast({ title: success })
      router.refresh()
      return true
    } catch (error) {
      toast({
        variant: "destructive",
        title: error instanceof Error ? error.message : "Could not update student",
      })
      return false
    } finally {
      setBusy(false)
    }
  }

  if (!students.length) {
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            {kind === "alumni" ? "No alumni match this directory view yet." : "No students match this directory view yet."}
          </p>
          <CreateDirectoryGroupDialog
            kind={kind}
            totalMatching={totalMatching}
            filters={filters}
            selectedIds={[]}
            canMutate={canMutate}
          />
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {selectedIds.length
            ? `${selectedIds.length.toLocaleString()} selected on this page`
            : `${totalMatching.toLocaleString()} match current filters`}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {somePageSelected ? (
            <Button type="button" size="sm" variant="ghost" className="rounded-full" onClick={() => setSelected({})}>
              Clear selection
            </Button>
          ) : null}
          <CreateDirectoryGroupDialog
            kind={kind}
            totalMatching={totalMatching}
            filters={filters}
            selectedIds={selectedIds}
            canMutate={canMutate}
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={allPageSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = somePageSelected && !allPageSelected
                  }}
                  onChange={(e) => toggleAllPage(e.target.checked)}
                  aria-label="Select all on this page"
                />
              </TableHead>
              <TableHead>Student name</TableHead>
              <TableHead>Student ID</TableHead>
              <TableHead>Program</TableHead>
              <TableHead>College</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Profile</TableHead>
              <TableHead>Last active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((row) => (
              <TableRow key={row.id} data-state={selected[row.id] ? "selected" : undefined}>
                <TableCell>
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={Boolean(selected[row.id])}
                    onChange={(e) =>
                      setSelected((prev) => {
                        const next = { ...prev }
                        if (e.target.checked) next[row.id] = true
                        else delete next[row.id]
                        return next
                      })
                    }
                    aria-label={`Select ${row.name}`}
                  />
                </TableCell>
                <TableCell className="min-w-[10rem] font-medium">
                  <Link href={`/candidates/${row.id}`} className="text-primary hover:underline">
                    {row.name}
                  </Link>
                  {row.suspended ? (
                    <Badge variant="outline" className="ml-2 align-middle">
                      Disconnected
                    </Badge>
                  ) : null}
                </TableCell>
                <TableCell className="font-data text-[13px] tabular-nums">{row.campusStudentId || "—"}</TableCell>
                <TableCell>{row.program || "—"}</TableCell>
                <TableCell>{row.college || "—"}</TableCell>
                <TableCell className="tabular-nums">{row.classYear || "—"}</TableCell>
                <TableCell>
                  <div className="flex min-w-[7rem] items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${row.completionPercent}%` }} />
                    </div>
                    <span className="tabular-nums text-[12px] text-muted-foreground">{row.completionPercent}%</span>
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap text-[13px] text-muted-foreground">{row.lastActiveLabel}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap justify-end gap-1.5">
                    <Button asChild size="sm" variant="outline" className="h-8 rounded-full px-2.5" title="Open profile">
                      <Link href={`/candidates/${row.id}`}>Profile</Link>
                    </Button>
                    {canMutate ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-full px-2.5"
                        title="Send message"
                        onClick={() => openMessage(row)}
                      >
                        <MessageSquare className="size-3.5" strokeWidth={1.75} />
                        <span className="sr-only sm:not-sr-only sm:inline">Message</span>
                      </Button>
                    ) : null}
                    {canMutate && kind === "students" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-full px-2.5"
                        title="Mark as graduated"
                        onClick={() => openGraduate(row)}
                      >
                        <GraduationCap className="size-3.5" strokeWidth={1.75} />
                        <span className="sr-only">Mark graduated</span>
                      </Button>
                    ) : null}
                    {canMutate ? (
                      row.suspended ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="h-8 rounded-full px-2.5"
                          disabled={busy}
                          onClick={() =>
                            void post({ action: "restore", studentId: row.id }, "Campus partnership restored")
                          }
                        >
                          Reconnect
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 rounded-full px-2.5 text-destructive"
                          title="Disconnect from career center"
                          onClick={() => openSuspend(row)}
                        >
                          <ShieldOff className="size-3.5" strokeWidth={1.75} />
                          <span className="sr-only sm:not-sr-only sm:inline">Disconnect</span>
                        </Button>
                      )
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={Boolean(suspendTarget)} onOpenChange={(open) => !open && setSuspendTarget(null)}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Disconnect {suspendTarget?.name} from this career center?</DialogTitle>
            <DialogDescription>
              They keep their SwypeJobs account and can still use Discover. They lose campus curated jobs, events,
              announcements, and advising until you reconnect them. This does not ban them from the platform.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Select value={suspendReason} onValueChange={setSuspendReason}>
                <SelectTrigger className="rounded-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUSPEND_REASONS.map((reason) => (
                    <SelectItem key={reason.id} value={reason.id}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="suspend-message">Note to student (optional)</Label>
              <Textarea
                id="suspend-message"
                rows={3}
                value={suspendMessage}
                onChange={(e) => setSuspendMessage(e.target.value)}
                placeholder="e.g. Contact the CDC if you are still enrolled."
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" className="rounded-full" onClick={() => setSuspendTarget(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="rounded-full"
              loading={busy}
              onClick={async () => {
                if (!suspendTarget) return
                const reasonLabel = SUSPEND_REASONS.find((r) => r.id === suspendReason)?.label || suspendReason
                const ok = await post(
                  {
                    action: "suspend",
                    studentId: suspendTarget.id,
                    reason: reasonLabel,
                    message: suspendMessage.trim() || undefined,
                  },
                  "Disconnected from career center"
                )
                if (ok) setSuspendTarget(null)
              }}
            >
              Disconnect from campus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(graduateTarget)} onOpenChange={(open) => !open && setGraduateTarget(null)}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark {graduateTarget?.name} as alumni</DialogTitle>
            <DialogDescription>Confirm graduation details. They move to the Alumni directory.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Graduation year</Label>
              <Select value={gradYear} onValueChange={setGradYear}>
                <SelectTrigger className="rounded-full">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="grad-program">Program</Label>
              <Input
                id="grad-program"
                value={gradProgram}
                onChange={(e) => setGradProgram(e.target.value)}
                placeholder="e.g. BS Computer Science"
                className="rounded-full"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="grad-notes">Notes (optional)</Label>
              <Textarea
                id="grad-notes"
                rows={2}
                value={gradNotes}
                onChange={(e) => setGradNotes(e.target.value)}
                placeholder="Confirmed by degree audit / registrar"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" className="rounded-full" onClick={() => setGraduateTarget(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-full"
              loading={busy}
              onClick={async () => {
                if (!graduateTarget) return
                const ok = await post(
                  {
                    action: "graduate",
                    studentId: graduateTarget.id,
                    graduationYear: Number(gradYear),
                    program: gradProgram.trim() || undefined,
                    notes: gradNotes.trim() || undefined,
                  },
                  "Moved to alumni"
                )
                if (ok) setGraduateTarget(null)
              }}
            >
              Confirm graduation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(messageTarget)} onOpenChange={(open) => !open && setMessageTarget(null)}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Message {messageTarget?.name}</DialogTitle>
            <DialogDescription>Sends an in-app notification from the career office.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="msg-title">Title</Label>
              <Input id="msg-title" value={messageTitle} onChange={(e) => setMessageTitle(e.target.value)} className="rounded-full" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="msg-body">Message</Label>
              <Textarea id="msg-body" rows={4} value={messageBody} onChange={(e) => setMessageBody(e.target.value)} required />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" className="rounded-full" onClick={() => setMessageTarget(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-full"
              loading={busy}
              disabled={!messageBody.trim()}
              onClick={async () => {
                if (!messageTarget) return
                const ok = await post(
                  {
                    action: "message",
                    studentId: messageTarget.id,
                    title: messageTitle.trim(),
                    message: messageBody.trim(),
                  },
                  "Message sent"
                )
                if (ok) setMessageTarget(null)
              }}
            >
              Send message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
