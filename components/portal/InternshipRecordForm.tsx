"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/lib/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function InternshipRecordForm() {
  const { toast } = useToast()
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [employer, setEmployer] = useState("")
  const [role, setRole] = useState("")
  const [start, setStart] = useState("")
  const [end, setEnd] = useState("")
  const [objectives, setObjectives] = useState("")

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from("experiential_records").insert({
      student_id: user.id,
      employer_name: employer.trim(),
      role_title: role.trim(),
      kind: "internship",
      start_date: start || null,
      end_date: end || null,
      learning_objectives: objectives.trim() || null,
      status: "self_reported",
    })
    setBusy(false)
    if (error) {
      toast({ variant: "destructive", title: "Couldn’t save record", description: error.message })
      return
    }
    setEmployer("")
    setRole("")
    setObjectives("")
    toast({ title: "Logged for career-office review" })
    router.refresh()
  }

  return (
    <form onSubmit={save} className="space-y-3 rounded-2xl border border-border p-4">
      <p className="text-sm font-medium">Log an internship or experiential role</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Employer</Label>
          <Input value={employer} onChange={(e) => setEmployer(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label>Role</Label>
          <Input value={role} onChange={(e) => setRole(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="intern-start">Start</Label>
          <DatePicker id="intern-start" value={start} onChange={setStart} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="intern-end">End</Label>
          <DatePicker id="intern-end" value={end} onChange={setEnd} min={start || undefined} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Learning objectives</Label>
        <Textarea rows={3} value={objectives} onChange={(e) => setObjectives(e.target.value)} />
      </div>
      <Button type="submit" className="rounded-full" loading={busy} loadingText="Saving…">
        Save record
      </Button>
    </form>
  )
}
