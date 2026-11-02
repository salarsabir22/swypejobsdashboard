"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { UniversityPicker } from "@/components/profile/UniversityPicker"
import { useToast } from "@/lib/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function PartnershipRequestForm({ companyName }: { companyName: string }) {
  const { toast } = useToast()
  const router = useRouter()
  const [university, setUniversity] = useState("")
  const [notes, setNotes] = useState("")
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!university.trim() || university === "Other (type your own)") {
      toast({ variant: "destructive", title: "Pick a university" })
      return
    }
    setBusy(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const { error } = await supabase.from("campus_employer_partners").insert({
      university: university.trim(),
      recruiter_id: user?.id,
      company_name: companyName,
      status: "pending",
      notes: notes.trim() || null,
    })
    setBusy(false)
    if (error) toast({ variant: "destructive", title: "Couldn’t send request", description: error.message })
    else {
      toast({ title: "Request sent" })
      router.refresh()
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-border p-4">
      <Label>University</Label>
      <UniversityPicker value={university} onChange={setUniversity} />
      <Label>Note to the career office</Label>
      <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      <Button type="submit" className="rounded-full" loading={busy}>
        Request partnership
      </Button>
    </form>
  )
}
