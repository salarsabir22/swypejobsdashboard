"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useToast } from "@/lib/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export function UniversityCreateForm() {
  const { toast } = useToast()
  const router = useRouter()
  const [name, setName] = useState("")
  const [domain, setDomain] = useState("")
  const [plan, setPlan] = useState("pilot")
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    try {
      const res = await fetch("/api/admin/universities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", name, domain: domain || undefined, plan }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        toast({ variant: "destructive", title: data.error || "Could not create campus" })
        return
      }
      toast({ title: "Campus created (pending)" })
      setName("")
      setDomain("")
      setPlan("pilot")
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5 sm:col-span-2">
        <Label>Campus name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="State University" required />
      </div>
      <div className="space-y-1.5">
        <Label>Email domain (optional)</Label>
        <Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="state.edu" />
      </div>
      <div className="space-y-1.5">
        <Label>Plan</Label>
        <Select value={plan} onValueChange={setPlan}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pilot">Pilot</SelectItem>
            <SelectItem value="standard">Standard</SelectItem>
            <SelectItem value="enterprise">Enterprise</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className="rounded-full sm:col-span-2" loading={busy} loadingText="Creating…">
        Create campus org
      </Button>
    </form>
  )
}
