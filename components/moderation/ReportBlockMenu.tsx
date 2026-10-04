"use client"

import { useEffect, useState, type ReactNode } from "react"
import { Flag, Ban, MoreHorizontal } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { isBlockedWith } from "@/lib/moderation/blocks"
import { useToast } from "@/lib/hooks/use-toast"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const REPORT_REASONS = [
  { value: "spam", label: "Spam or scam" },
  { value: "harassment", label: "Harassment" },
  { value: "fake", label: "Fake profile or listing" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "other", label: "Something else" },
]

export function ReportBlockMenu({
  currentUserId,
  peerId,
  peerName,
  onBlocked,
  extraItems,
}: {
  currentUserId: string
  peerId: string
  peerName?: string | null
  onBlocked?: () => void
  extraItems?: ReactNode
}) {
  const { toast } = useToast()
  const [blockedByMe, setBlockedByMe] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [reason, setReason] = useState("spam")
  const [details, setDetails] = useState("")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const run = async () => {
      const supabase = createClient()
      const state = await isBlockedWith(supabase, currentUserId, peerId)
      setBlockedByMe(state.blockedByMe)
    }
    void run()
  }, [currentUserId, peerId])

  const toggleBlock = async () => {
    setBusy(true)
    const supabase = createClient()
    if (blockedByMe) {
      const { error } = await supabase
        .from("blocks")
        .delete()
        .eq("blocker_id", currentUserId)
        .eq("blocked_id", peerId)
      if (error) {
        toast({ variant: "destructive", title: "Could not unblock", description: error.message })
      } else {
        setBlockedByMe(false)
        toast({ title: "Unblocked" })
      }
    } else {
      const { error } = await supabase.from("blocks").insert({
        blocker_id: currentUserId,
        blocked_id: peerId,
      })
      if (error) {
        toast({ variant: "destructive", title: "Could not block", description: error.message })
      } else {
        setBlockedByMe(true)
        toast({ title: "Blocked", description: "They won’t show up in Discover or Messages." })
        onBlocked?.()
      }
    }
    setBusy(false)
  }

  const submitReport = async () => {
    setBusy(true)
    const supabase = createClient()
    const { error } = await supabase.from("reports").insert({
      reporter_id: currentUserId,
      reported_id: peerId,
      reason,
      details: details.trim() || null,
    })
    if (error) {
      toast({ variant: "destructive", title: "Could not send report", description: error.message })
    } else {
      toast({ title: "Report sent", description: "Thanks — we’ll review it." })
      setReportOpen(false)
      setDetails("")
    }
    setBusy(false)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="icon" className="rounded-full" aria-label="More actions">
            <MoreHorizontal className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {extraItems ? (
            <>
              {extraItems}
              <DropdownMenuSeparator />
            </>
          ) : null}
          <DropdownMenuItem disabled={busy} onSelect={() => setReportOpen(true)}>
            <Flag />
            Report
          </DropdownMenuItem>
          <DropdownMenuItem disabled={busy} onSelect={() => void toggleBlock()}>
            <Ban />
            {blockedByMe ? "Unblock" : "Block"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report {peerName || "this profile"}</DialogTitle>
            <DialogDescription>Reports go to swypejobs admins. Blocking is separate if you also want them gone from your feed.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="report-reason">Reason</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger id="report-reason" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_REASONS.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="report-details">Details (optional)</Label>
              <Textarea
                id="report-details"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={3}
                placeholder="What happened?"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setReportOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={busy} onClick={() => void submitReport()}>
              Send report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
