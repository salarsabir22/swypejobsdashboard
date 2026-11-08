"use client"

import { useState } from "react"
import { useToast } from "@/lib/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

export function BroadcastForm() {
  const { toast } = useToast()
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [segment, setSegment] = useState("all_students")
  const [busy, setBusy] = useState(false)
  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      const res = await fetch("/api/admin/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, segment }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        delivered?: number
        recipients?: number
        capped?: boolean
      }
      if (!res.ok) {
        toast({ variant: "destructive", title: data.error || "Broadcast failed" })
        return
      }
      toast({
        title: `Delivered to ${data.delivered ?? 0}`,
        description: data.capped
          ? `Capped at ${data.recipients} recipients for this send.`
          : `${data.recipients ?? 0} in segment.`,
      })
      setTitle("")
      setBody("")
    } finally {
      setBusy(false)
    }
  }
  return (
    <form onSubmit={send} className="space-y-3">
      <Label>Segment</Label>
      <Select value={segment} onValueChange={setSegment}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all_students">All students</SelectItem>
          <SelectItem value="all_recruiters">All employers</SelectItem>
          <SelectItem value="inactive">Inactive 14d</SelectItem>
        </SelectContent>
      </Select>
      <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      <Textarea rows={4} placeholder="Body" value={body} onChange={(e) => setBody(e.target.value)} required />
      <Button type="submit" className="rounded-full" loading={busy} loadingText="Sending…">
        Send in-app
      </Button>
    </form>
  )
}
