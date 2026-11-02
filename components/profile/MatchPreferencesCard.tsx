"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/lib/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const GENDERS = [
  { id: "", label: "Prefer not to say" },
  { id: "woman", label: "Woman" },
  { id: "man", label: "Man" },
  { id: "non_binary", label: "Non-binary" },
]

/** Optional fields employers can target: gender, department, where you want to work. */
export function MatchPreferencesCard({
  userId,
  gender: initialGender,
  department: initialDepartment,
  locations: initialLocations,
}: {
  userId: string
  gender?: string | null
  department?: string | null
  locations?: string[] | null
}) {
  const { toast } = useToast()
  const [gender, setGender] = useState(initialGender || "")
  const [department, setDepartment] = useState(initialDepartment || "")
  const [locations, setLocations] = useState((initialLocations || []).join(", "))
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    const supabase = createClient()
    const preferred_locations = locations.split(",").map((s) => s.trim()).filter(Boolean)
    const { error } = await supabase.from("student_profiles").update({ gender: gender || null, department: department.trim() || null, preferred_locations }).eq("id", userId)
    setSaving(false)
    if (error) {
      const missing = /gender|department|preferred_locations/i.test(error.message)
      toast({ variant: "destructive", title: "Couldn’t save", description: missing ? "These preferences aren’t available on this workspace yet." : error.message })
      return
    }
    toast({ title: "Preferences saved" })
  }

  return (
    <Card className="shadow-sm">
      <CardContent className="space-y-4 p-5">
        <div>
          <h2 className="font-data text-[10px] uppercase tracking-wide text-muted-foreground">Who can match you</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">Used only when an employer limits a role. Gender stays blank unless you set it.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="pref-gender">Gender</Label>
            <Select value={gender || "unset"} onValueChange={(v) => setGender(v === "unset" ? "" : v)}>
              <SelectTrigger id="pref-gender">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GENDERS.map((option) => (
                  <SelectItem key={option.id || "unset"} value={option.id || "unset"}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pref-dept">Department</Label>
            <Input id="pref-dept" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Finance" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pref-locations">Where you’ll work</Label>
          <Input id="pref-locations" value={locations} onChange={(e) => setLocations(e.target.value)} placeholder="Karachi, Lahore, Remote" />
        </div>
        <Button type="button" size="sm" className="rounded-full" onClick={() => void save()} loading={saving} loadingText="Saving…">
          Save
        </Button>
      </CardContent>
    </Card>
  )
}
