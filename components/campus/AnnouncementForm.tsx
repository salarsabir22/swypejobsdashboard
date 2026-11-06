"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/lib/hooks/use-toast"
import {
  ANNOUNCEMENT_AUDIENCE_GROUPS,
  ANNOUNCEMENT_AUDIENCE_OPTIONS,
  serializeAnnouncementAudience,
  type AnnouncementAudienceGroup,
} from "@/lib/campus/announcement-audience"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function AnnouncementForm({ university }: { university: string }) {
  const { toast } = useToast()
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [groups, setGroups] = useState<AnnouncementAudienceGroup[]>(["students"])
  const [requiresAck, setRequiresAck] = useState(false)
  const [busy, setBusy] = useState(false)

  const allSelected = groups.length === ANNOUNCEMENT_AUDIENCE_GROUPS.length

  const toggleGroup = (id: AnnouncementAudienceGroup) => {
    setGroups((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((g) => g !== id)
        return next.length ? next : prev
      }
      return ANNOUNCEMENT_AUDIENCE_GROUPS.filter((g) => prev.includes(g) || g === id)
    })
  }

  const toggleEveryone = () => {
    setGroups(allSelected ? ["students"] : [...ANNOUNCEMENT_AUDIENCE_GROUPS])
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (groups.length === 0) {
      toast({ variant: "destructive", title: "Pick an audience", description: "Select at least one group." })
      return
    }
    setBusy(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const audience = serializeAnnouncementAudience(groups)
    const { error } = await supabase.from("campus_announcements").insert({
      university,
      title: title.trim(),
      body: body.trim(),
      audience,
      requires_ack: requiresAck,
      created_by: user?.id,
    })
    setBusy(false)
    if (error) toast({ variant: "destructive", title: "Couldn’t publish", description: error.message })
    else {
      setTitle("")
      setBody("")
      setGroups(["students"])
      setRequiresAck(false)
      toast({ title: "Published" })
      router.refresh()
    }
  }

  return (
    <form onSubmit={save} className="space-y-3">
      <Label>Title</Label>
      <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
      <Label>Body</Label>
      <Textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} required />
      <div className="space-y-2">
        <Label>Audience</Label>
        <p className="text-[13px] text-muted-foreground">Select one or more groups. Students + alumni won’t notify employers.</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex items-start gap-3 rounded-2xl border border-border bg-secondary/40 p-3 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 size-4 accent-[var(--primary)]"
              checked={allSelected}
              onChange={toggleEveryone}
            />
            <span>
              <span className="font-medium">Everyone</span>
              <span className="block text-[13px] text-muted-foreground">Students, alumni, and employers</span>
            </span>
          </label>
          {ANNOUNCEMENT_AUDIENCE_OPTIONS.map((option) => (
            <label
              key={option.id}
              className="flex items-start gap-3 rounded-2xl border border-border bg-secondary/40 p-3 text-sm"
            >
              <input
                type="checkbox"
                className="mt-0.5 size-4 accent-[var(--primary)]"
                checked={groups.includes(option.id)}
                onChange={() => toggleGroup(option.id)}
              />
              <span>
                <span className="font-medium">{option.label}</span>
                <span className="block text-[13px] text-muted-foreground">{option.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={requiresAck} onChange={(e) => setRequiresAck(e.target.checked)} />
        Require acknowledgement
      </label>
      <Button type="submit" className="rounded-full" loading={busy}>
        Publish
      </Button>
    </form>
  )
}
