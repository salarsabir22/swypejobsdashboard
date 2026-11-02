"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const KINDS = [
  { id: "study_abroad", label: "Study abroad" },
  { id: "exchange", label: "Exchange" },
  { id: "dual_degree", label: "Dual degree" },
  { id: "scholarship", label: "Scholarship" },
]

export function OpportunityForm() {
  const [kind, setKind] = useState(KINDS[0].id)
  const [title, setTitle] = useState("")
  const [country, setCountry] = useState("")
  const [organization, setOrganization] = useState("")
  const [summary, setSummary] = useState("")
  const [eligibility, setEligibility] = useState("")
  const [visaUrl, setVisaUrl] = useState("")
  const [applyUrl, setApplyUrl] = useState("")
  const [deadline, setDeadline] = useState("")
  const [message, setMessage] = useState("")
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    setMessage("")
    const res = await fetch("/api/campus/opportunities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, title, country, organization, summary, eligibility, visaUrl, applyUrl, deadline }),
    })
    const body = (await res.json().catch(() => null)) as { error?: string } | null
    setSaving(false)
    if (!res.ok) {
      setMessage(body?.error || "Couldn’t save")
      return
    }
    setTitle("")
    setSummary("")
    setMessage("Listed. Students see it under International opportunities.")
  }

  return (
    <div className="max-w-2xl space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="opp-kind">Kind</Label>
          <select id="opp-kind" className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm" value={kind} onChange={(e) => setKind(e.target.value)}>
            {KINDS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="opp-deadline">Deadline</Label>
          <Input id="opp-deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
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
      <Button type="button" className="rounded-full" onClick={() => void save()} loading={saving} loadingText="Saving…">Publish</Button>
    </div>
  )
}
