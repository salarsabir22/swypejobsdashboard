"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/lib/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function AnnouncementForm({ university }: { university: string }) {
  const { toast } = useToast()
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [audience, setAudience] = useState("students")
  const [requiresAck, setRequiresAck] = useState(false)
  const [busy, setBusy] = useState(false)

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
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
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Audience</Label>
          <Select value={audience} onValueChange={setAudience}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="students">Students</SelectItem>
              <SelectItem value="alumni">Alumni</SelectItem>
              <SelectItem value="employers">Employers</SelectItem>
              <SelectItem value="all">Everyone</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <label className="flex items-center gap-2 pt-6 text-sm">
          <input type="checkbox" checked={requiresAck} onChange={(e) => setRequiresAck(e.target.checked)} />
          Require acknowledgement
        </label>
      </div>
      <Button type="submit" className="rounded-full" loading={busy}>
        Publish
      </Button>
    </form>
  )
}
