"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/lib/hooks/use-toast"
import { normalizeCalendlyUrl } from "@/lib/hiring/interview-invite"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function RecruiterIntegrationsCard({
  calendlyUrl: initialCalendly,
}: {
  calendlyUrl?: string | null
}) {
  const { toast } = useToast()
  const [calendly, setCalendly] = useState(initialCalendly ?? "")
  const [saving, setSaving] = useState(false)

  const saveCalendly = async () => {
    setSaving(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      setSaving(false)
      return
    }
    const url = normalizeCalendlyUrl(calendly)
    const { error } = await supabase.from("recruiter_profiles").update({ calendly_url: url || null }).eq("id", user.id)
    if (error) {
      toast({ variant: "destructive", title: "Could not save Calendly", description: error.message })
    } else {
      setCalendly(url)
      toast({ title: "Calendly saved" })
    }
    setSaving(false)
  }

  return (
    <Card className="shadow-sm">
      <CardContent className="space-y-5 p-5">
        <div>
          <h2 className="text-[16px] font-semibold tracking-[-0.02em]">Calendly</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            This link is included when you shortlist someone, so they can book a 30-minute interview.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="calendly-url">Booking link</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="calendly-url"
              value={calendly}
              onChange={(e) => setCalendly(e.target.value)}
              placeholder="https://calendly.com/your-company/30min"
            />
            <Button type="button" className="shrink-0" onClick={() => void saveCalendly()} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
