"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Linkedin, MessageSquare, ShieldOff } from "lucide-react"
import type { CampusDirectoryEmployer, CampusEmployerDirectoryFilters } from "@/lib/campus/employer-directory"
import { useToast } from "@/lib/hooks/use-toast"
import { CreateDirectoryGroupDialog } from "@/components/campus/CreateDirectoryGroupDialog"
import { PartnershipReviewButtons } from "@/components/campus/PartnershipReviewButtons"
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
  { id: "policy", label: "Partnership / policy issue" },
  { id: "inactivity", label: "Prolonged inactivity with this campus" },
  { id: "spam", label: "Spam or low-quality postings for this campus" },
  { id: "other", label: "Other / custom" },
] as const

export function EmployerDirectory({
  employers,
  canMutate,
  totalMatching = 0,
  filters = {},
}: {
  employers: CampusDirectoryEmployer[]
  canMutate: boolean
  totalMatching?: number
  filters?: CampusEmployerDirectoryFilters
}) {
  const { toast } = useToast()
  const router = useRouter()
  const [suspendTarget, setSuspendTarget] = useState<CampusDirectoryEmployer | null>(null)
  const [messageTarget, setMessageTarget] = useState<CampusDirectoryEmployer | null>(null)
  const [busy, setBusy] = useState(false)
  const [selected, setSelected] = useState<Record<string, boolean>>({})

  const [suspendReason, setSuspendReason] = useState<string>("policy")
  const [suspendMessage, setSuspendMessage] = useState("")
  const [messageTitle, setMessageTitle] = useState("Message from IoBM CDC")
  const [messageBody, setMessageBody] = useState("")

  const selectable = useMemo(() => employers.filter((row) => !row.id.startsWith("partner:")), [employers])
  const selectedIds = useMemo(
    () => selectable.filter((row) => selected[row.id]).map((row) => row.id),
    [selectable, selected]
  )
  const allPageSelected = selectable.length > 0 && selectable.every((row) => selected[row.id])
  const somePageSelected = selectable.some((row) => selected[row.id])

  const toggleAllPage = (checked: boolean) => {
    setSelected((prev) => {
      const next = { ...prev }
      for (const row of selectable) {
        if (checked) next[row.id] = true
        else delete next[row.id]
      }
      return next
    })
  }

  const post = async (payload: Record<string, unknown>, success: string) => {
    setBusy(true)
    try {
      const res = await fetch("/api/campus/employers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        toast({ variant: "destructive", title: data.error || "Could not update employer" })
        return false
      }
      toast({ title: success })
      router.refresh()
      return true
    } catch (error) {
      toast({
        variant: "destructive",
        title: error instanceof Error ? error.message : "Could not update employer",
      })
      return false
    } finally {
      setBusy(false)
    }
  }

  if (!employers.length) {
    return (
      <p className="text-sm text-muted-foreground">No employers match this directory view yet.</p>
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
            kind="employers"
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
                  disabled={!selectable.length}
                />
              </TableHead>
              <TableHead>Employer name</TableHead>
              <TableHead>Industry</TableHead>
              <TableHead>LinkedIn</TableHead>
              <TableHead>Jobs posted</TableHead>
              <TableHead>Students hired</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employers.map((row) => {
              const hasAccount = !row.id.startsWith("partner:")
              return (
                <TableRow key={row.id} data-state={selected[row.id] ? "selected" : undefined}>
                  <TableCell>
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={Boolean(selected[row.id])}
                      disabled={!hasAccount}
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
                    {hasAccount ? (
                      <Link href={`/company/${row.id}`} className="text-primary hover:underline">
                        {row.name}
                      </Link>
                    ) : (
                      row.name
                    )}
                    {row.suspended ? (
                      <Badge variant="outline" className="ml-2 align-middle">
                        Disconnected
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell>{row.industry || "—"}</TableCell>
                  <TableCell>
                    {row.linkedinUrl ? (
                      <a
                        href={row.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex size-8 items-center justify-center rounded-full text-[#0A66C2] hover:bg-secondary"
                        title="Open LinkedIn"
                        aria-label={`${row.name} on LinkedIn`}
                      >
                        <Linkedin className="size-4" strokeWidth={1.75} />
                      </a>
                    ) : (
                      <span className="inline-flex size-8 items-center justify-center text-muted-foreground/40" title="No LinkedIn on file">
                        <Linkedin className="size-4" strokeWidth={1.75} />
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums">{row.jobsPosted.toLocaleString()}</TableCell>
                  <TableCell className="tabular-nums">{row.studentsHired.toLocaleString()}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {canMutate && row.partnerId && row.status === "pending" ? (
                        <PartnershipReviewButtons id={row.partnerId} />
                      ) : null}
                      {hasAccount ? (
                        <Button asChild size="sm" variant="outline" className="h-8 rounded-full px-2.5" title="Open profile">
                          <Link href={`/company/${row.id}`}>Profile</Link>
                        </Button>
                      ) : null}
                      {canMutate && hasAccount ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 rounded-full px-2.5"
                          title="Send message"
                          onClick={() => {
                            setMessageTarget(row)
                            setMessageTitle("Message from IoBM CDC")
                            setMessageBody("")
                          }}
                        >
                          <MessageSquare className="size-3.5" strokeWidth={1.75} />
                          <span className="sr-only sm:not-sr-only sm:inline">Message</span>
                        </Button>
                      ) : null}
                      {canMutate && hasAccount ? (
                        row.suspended ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="h-8 rounded-full px-2.5"
                            disabled={busy}
                            onClick={() =>
                              void post({ action: "restore", employerId: row.id }, "Campus partnership restored")
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
                            title="End campus partnership"
                            onClick={() => {
                              setSuspendTarget(row)
                              setSuspendReason("policy")
                              setSuspendMessage("")
                            }}
                          >
                            <ShieldOff className="size-3.5" strokeWidth={1.75} />
                            <span className="sr-only sm:not-sr-only sm:inline">Disconnect</span>
                          </Button>
                        )
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={Boolean(suspendTarget)} onOpenChange={(open) => !open && setSuspendTarget(null)}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>End partnership with {suspendTarget?.name}?</DialogTitle>
            <DialogDescription>
              They keep their SwypeJobs account and can still post to the network and other partner campuses. They can no
              longer target this university. Existing campus-targeted jobs for this school are removed from that list.
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
              <Label htmlFor="emp-suspend-message">Note to employer (optional)</Label>
              <Textarea
                id="emp-suspend-message"
                rows={3}
                value={suspendMessage}
                onChange={(e) => setSuspendMessage(e.target.value)}
                placeholder="e.g. Contact the CDC to reinstate your partnership."
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
                    employerId: suspendTarget.id,
                    reason: reasonLabel,
                    message: suspendMessage.trim() || undefined,
                  },
                  "Campus partnership ended"
                )
                if (ok) setSuspendTarget(null)
              }}
            >
              Disconnect from campus
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
              <Label htmlFor="emp-msg-title">Title</Label>
              <Input
                id="emp-msg-title"
                value={messageTitle}
                onChange={(e) => setMessageTitle(e.target.value)}
                className="rounded-full"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="emp-msg-body">Message</Label>
              <Textarea id="emp-msg-body" rows={4} value={messageBody} onChange={(e) => setMessageBody(e.target.value)} required />
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
                    employerId: messageTarget.id,
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
