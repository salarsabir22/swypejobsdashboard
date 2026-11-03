"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/lib/hooks/use-toast"
import { emptyAcademicRecord, primaryAcademicFields, type AcademicRecord } from "@/lib/profile/academics"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function AcademicHistoryEditor({ userId, initial }: { userId: string; initial: AcademicRecord[] }) {
  const { toast } = useToast()
  const [rows, setRows] = useState<AcademicRecord[]>(initial.length ? initial : [emptyAcademicRecord()])
  const [saving, setSaving] = useState(false)

  const update = (id: string, patch: Partial<AcademicRecord>) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : patch.current ? { ...row, current: false } : row)))
  }

  const save = async () => {
    const clean = rows.filter((row) => row.institution.trim() || row.degree.trim())
    if (!clean.length) {
      toast({ variant: "destructive", title: "Add at least one degree" })
      return
    }
    if (!clean.some((row) => row.current)) clean[0] = { ...clean[0], current: true }
    setSaving(true)
    const supabase = createClient()
    const primary = primaryAcademicFields(clean)
    const payload: Record<string, unknown> = { id: userId, academic_history: clean, ...primary }
    let { data, error } = await supabase.from("student_profiles").update(payload).eq("id", userId).select("id")
    if (error && /academic_history|department/i.test(error.message)) {
      delete payload.academic_history
      delete payload.department
      ;({ data, error } = await supabase.from("student_profiles").update(payload).eq("id", userId).select("id"))
    }
    if (!error && (!data || data.length === 0)) {
      const inserted = await supabase.from("student_profiles").upsert(payload, { onConflict: "id" }).select("id")
      error = inserted.error
      data = inserted.data
    }
    setSaving(false)
    if (error) {
      toast({ variant: "destructive", title: "Couldn’t save", description: error.message })
      return
    }
    setRows(clean)
    toast({ title: "Education saved" })
  }

  return (
    <div className="space-y-6">
      {rows.map((row, index) => (
        <div key={row.id} className="space-y-3 rounded-2xl border border-border p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">Degree {index + 1}</p>
            <label className="flex items-center gap-2 text-[13px]">
              <input type="checkbox" className="size-4 accent-[var(--primary)]" checked={row.current} onChange={(e) => update(row.id, { current: e.target.checked })} />
              Current / most recent
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Institution</Label>
              <Input value={row.institution} onChange={(e) => update(row.id, { institution: e.target.value })} placeholder="Your university" />
            </div>
            <div className="space-y-1.5">
              <Label>Degree</Label>
              <Input value={row.degree} onChange={(e) => update(row.id, { degree: e.target.value })} placeholder="BBA" />
            </div>
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Input value={row.department} onChange={(e) => update(row.id, { department: e.target.value })} placeholder="Finance" />
            </div>
            <div className="space-y-1.5">
              <Label>CGPA</Label>
              <Input value={row.cgpa} inputMode="decimal" onChange={(e) => update(row.id, { cgpa: e.target.value })} placeholder="3.40" />
            </div>
            <div className="space-y-1.5">
              <Label>Start year</Label>
              <Input value={row.startYear} inputMode="numeric" onChange={(e) => update(row.id, { startYear: e.target.value })} placeholder="2022" />
            </div>
            <div className="space-y-1.5">
              <Label>Graduation year</Label>
              <Input value={row.endYear} inputMode="numeric" onChange={(e) => update(row.id, { endYear: e.target.value })} placeholder="2026" />
            </div>
          </div>
          {rows.length > 1 ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => setRows((prev) => prev.filter((item) => item.id !== row.id))}>
              Remove
            </Button>
          ) : null}
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" className="rounded-full" onClick={() => setRows((prev) => [...prev, emptyAcademicRecord()])}>
          Add another degree
        </Button>
        <Button type="button" className="rounded-full" onClick={() => void save()} loading={saving} loadingText="Saving…">
          Save education
        </Button>
      </div>
    </div>
  )
}
