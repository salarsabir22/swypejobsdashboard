"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/lib/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function EmployerInviteForm({ university }: { university: string }) {
  const { toast } = useToast()
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [companyName, setCompanyName] = useState("")
  const [contactName, setContactName] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [website, setWebsite] = useState("")
  const [sector, setSector] = useState("")
  const [message, setMessage] = useState("")

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    const res = await fetch("/api/campus/employer-invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ university, companyName, contactName, contactEmail, website, sector, message }),
    })
    const json = (await res.json().catch(() => ({}))) as { error?: string; emailed?: boolean; inviteUrl?: string }
    setBusy(false)
    if (!res.ok) {
      toast({ variant: "destructive", title: "Couldn’t invite", description: json.error })
      return
    }
    toast({
      title: json.emailed ? "Invitation emailed" : "Invitation created",
      description: json.emailed ? undefined : "Email isn’t configured, so share the invite link from the list after refresh.",
    })
    setCompanyName("")
    setContactEmail("")
    router.refresh()
  }

  return (
    <form onSubmit={send} className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label>Company</Label>
        <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
      </div>
      <div className="space-y-1.5">
        <Label>Contact name</Label>
        <Input value={contactName} onChange={(e) => setContactName(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Work email</Label>
        <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} required />
      </div>
      <div className="space-y-1.5">
        <Label>Website</Label>
        <Input value={website} onChange={(e) => setWebsite(e.target.value)} />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label>Sector</Label>
        <Input value={sector} onChange={(e) => setSector(e.target.value)} />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label>Message</Label>
        <Textarea rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
      </div>
      <Button type="submit" className="rounded-full sm:col-span-2" loading={busy}>
        Send invitation
      </Button>
    </form>
  )
}
