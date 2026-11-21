"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { OPPORTUNITY_KINDS } from "@/lib/campus/opportunities"

export type OpportunityDraft = {
  id?: string
  kind: string
  title: string
  country: string
  organization: string
  summary: string
  eligibility: string
  visaUrl: string
  applyUrl: string
  deadline: string
}

const EMPTY_DRAFT: OpportunityDraft = {
  kind: OPPORTUNITY_KINDS[0].id,
  title: "",
  country: "",
  organization: "",
  summary: "",
  eligibility: "",
  visaUrl: "",
  applyUrl: "",
  deadline: "",
}

export function OpportunityForm({
  initial,
  onSaved,
}: {
  initial?: OpportunityDraft
  onSaved?: (message: string) => void
}) {
  const [id] = useState(initial?.id)
  const [kind, setKind] = useState(initial?.kind || EMPTY_DRAFT.kind)
  const [title, setTitle] = useState(initial?.title || "")
  const [country, setCountry] = useState(initial?.country || "")
  const [organization, setOrganization] = useState(initial?.organization || "")
  const [summary, setSummary] = useState(initial?.summary || "")
  const [eligibility, setEligibility] = useState(initial?.eligibility || "")
  const [visaUrl, setVisaUrl] = useState(initial?.visaUrl || "")
  const [applyUrl, setApplyUrl] = useState(initial?.applyUrl || "")
  const [deadline, setDeadline] = useState(initial?.deadline || "")
  const [message, setMessage] = useState("")
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!title.trim()) {
      setMessage("Add a title before saving.")
      return
    }
    setSaving(true)
    setMessage("")
    const res = await fetch("/api/campus/opportunities", {
      method: id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        kind,
        title,
        country,
        organization,
        summary,
        eligibility,
        visaUrl,
        applyUrl,
        deadline,
      }),
    })
    const body = (await res.json().catch(() => null)) as { error?: string } | null
    setSaving(false)
    if (!res.ok) {
      setMessage(body?.error || "Couldn’t save")
      return
    }
    if (!id) {
      setTitle("")
      setSummary("")
      setEligibility("")
      setCountry("")
      setOrganization("")
      setApplyUrl("")
      setVisaUrl("")
      setDeadline("")
    }
    const done = id ? "Changes saved." : "Listed. Students see it under International opportunities."
    setMessage(done)
    onSaved?.(done)
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="opp-kind">Kind</Label>
          <Select value={kind} onValueChange={setKind}>
            <SelectTrigger id="opp-kind">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OPPORTUNITY_KINDS.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="opp-deadline">Deadline</Label>
          <DatePicker id="opp-deadline" value={deadline} onChange={setDeadline} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="opp-title">Title</Label>
          <Input id="opp-title" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="opp-country">Country</Label>
          <Input id="opp-country" value={country} onChange={(e) => setCountry(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="opp-org">Organization</Label>
          <Input id="opp-org" value={organization} onChange={(e) => setOrganization(e.target.value)} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="opp-summary">Summary</Label>
          <Textarea id="opp-summary" rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="opp-elig">Eligibility</Label>
          <Input id="opp-elig" value={eligibility} onChange={(e) => setEligibility(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="opp-apply">Apply URL</Label>
          <Input id="opp-apply" value={applyUrl} onChange={(e) => setApplyUrl(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="opp-visa">Visa information URL</Label>
          <Input id="opp-visa" value={visaUrl} onChange={(e) => setVisaUrl(e.target.value)} />
        </div>
      </div>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      <Button type="button" className="rounded-full" onClick={() => void save()} loading={saving} loadingText="Saving…">
        {id ? "Save changes" : "Publish listing"}
      </Button>
    </div>
  )
}
