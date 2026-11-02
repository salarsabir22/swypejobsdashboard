"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DEGREE_PROGRAM_SUGGESTIONS,
  EXPERIENCE_LABEL,
  EXPERIENCE_LEVELS,
  type ExperienceLevel,
} from "@/lib/jobs/targeting"

const THIS_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = Array.from({ length: 8 }, (_, i) => THIS_YEAR - 3 + i)

export type JobTargetingValue = {
  degreePrograms: string[]
  graduationYears: number[]
  minCgpa: string
  experienceLevel: ExperienceLevel
  alumniOnly: boolean
  genders: string[]
  departments: string[]
  locationPreferences: string[]
}

export function JobTargetingEditor({
  value,
  onChange,
}: {
  value: JobTargetingValue
  onChange: (next: JobTargetingValue) => void
}) {
  const [programInput, setProgramInput] = useState("")
  const [departmentInput, setDepartmentInput] = useState("")
  const [locationInput, setLocationInput] = useState("")

  const addProgram = (raw: string) => {
    const p = raw.trim()
    if (!p) return
    if (value.degreePrograms.some((x) => x.toLowerCase() === p.toLowerCase())) {
      setProgramInput("")
      return
    }
    onChange({ ...value, degreePrograms: [...value.degreePrograms, p] })
    setProgramInput("")
  }

  const removeProgram = (p: string) => onChange({ ...value, degreePrograms: value.degreePrograms.filter((x) => x !== p) })

  const toggleYear = (y: number) =>
    onChange({
      ...value,
      graduationYears: value.graduationYears.includes(y)
        ? value.graduationYears.filter((x) => x !== y)
        : [...value.graduationYears, y].sort((a, b) => a - b),
    })

  return (
    <div className="space-y-6">
      <div>
        <Label>Who should see this role</Label>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Every filter is optional. Candidates outside the audience won’t see the listing in Discover and can’t apply.
        </p>
      </div>

      <label className="flex items-start gap-3 rounded-2xl border border-border bg-secondary/40 p-4 text-sm">
        <input
          type="checkbox"
          className="mt-0.5 size-4 accent-[var(--primary)]"
          checked={value.alumniOnly}
          onChange={(e) => onChange({ ...value, alumniOnly: e.target.checked })}
        />
        <span>
          <span className="font-medium">Alumni only</span>
          <span className="block text-[13px] text-muted-foreground">
            Mid-career and senior roles. Hidden from current students; only graduates see and apply.
          </span>
        </span>
      </label>

      <div className="space-y-3">
        <Label htmlFor="target-programs">Degree programs</Label>
        <div className="flex min-w-0 gap-2">
          <Input
            id="target-programs"
            className="h-11 rounded-xl"
            placeholder="e.g. BBA, BS Computer Science"
            value={programInput}
            onChange={(e) => setProgramInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                addProgram(programInput)
              }
            }}
          />
          <Button type="button" variant="secondary" className="h-11 shrink-0 rounded-xl" onClick={() => addProgram(programInput)}>
            Add
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {DEGREE_PROGRAM_SUGGESTIONS.filter((s) => !value.degreePrograms.some((x) => x.toLowerCase() === s.toLowerCase()))
            .slice(0, 6)
            .map((s) => (
              <Button
                key={s}
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full border-dashed"
                onClick={() => addProgram(s)}
              >
                + {s}
              </Button>
            ))}
        </div>
        {value.degreePrograms.length ? (
          <div className="flex flex-wrap gap-2">
            {value.degreePrograms.map((p) => (
              <Badge key={p} variant="secondary" className="gap-1.5">
                {p}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 text-muted-foreground hover:text-foreground"
                  aria-label={`Remove ${p}`}
                  onClick={() => removeProgram(p)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-muted-foreground">Any program.</p>
        )}
      </div>

      <div className="space-y-3">
        <Label>Graduation year</Label>
        <div className="flex flex-wrap gap-2">
          {YEAR_OPTIONS.map((y) => {
            const on = value.graduationYears.includes(y)
            return (
              <Button key={y} type="button" variant={on ? "default" : "outline"} size="sm" onClick={() => toggleYear(y)}>
                {y}
              </Button>
            )
          })}
        </div>
        <p className="text-[13px] text-muted-foreground">
          {value.graduationYears.length ? `Class of ${value.graduationYears.join(", ")}.` : "Any graduation year."}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="target-cgpa">Minimum CGPA</Label>
          <Input
            id="target-cgpa"
            className="h-11 rounded-xl"
            inputMode="decimal"
            placeholder="e.g. 3.00"
            value={value.minCgpa}
            onChange={(e) => {
              const v = e.target.value.replace(/[^\d.]/g, "")
              onChange({ ...value, minCgpa: v })
            }}
          />
          <p className="text-[12px] text-muted-foreground">On a 4.00 scale. Leave blank for no threshold.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="target-experience">Experience</Label>
          <Select value={value.experienceLevel} onValueChange={(v) => onChange({ ...value, experienceLevel: v as ExperienceLevel })}>
            <SelectTrigger id="target-experience" className="h-11 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EXPERIENCE_LEVELS.map((level) => (
                <SelectItem key={level} value={level}>
                  {EXPERIENCE_LABEL[level]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[12px] text-muted-foreground">
            “Experienced” means graduated before {THIS_YEAR}; “fresh” means still enrolled or graduating {THIS_YEAR} or later.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="target-department">Departments</Label>
        <div className="flex min-w-0 gap-2">
          <Input id="target-department" className="h-11 rounded-xl" value={departmentInput} placeholder="e.g. Finance" onChange={(e) => setDepartmentInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const p = departmentInput.trim(); if (p) onChange({ ...value, departments: [...value.departments, p] }); setDepartmentInput("") } }} />
          <Button type="button" variant="outline" className="rounded-xl" onClick={() => { const p = departmentInput.trim(); if (p) onChange({ ...value, departments: [...value.departments, p] }); setDepartmentInput("") }}>Add</Button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {value.departments.map((d) => (
            <Badge key={d} variant="secondary" className="gap-1 font-normal">
              {d}
              <button type="button" aria-label={`Remove ${d}`} onClick={() => onChange({ ...value, departments: value.departments.filter((x) => x !== d) })}><X className="h-3 w-3" /></button>
            </Badge>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="target-location">Candidate locations</Label>
        <div className="flex min-w-0 gap-2">
          <Input id="target-location" className="h-11 rounded-xl" value={locationInput} placeholder="Karachi, Lahore, Remote" onChange={(e) => setLocationInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const p = locationInput.trim(); if (p) onChange({ ...value, locationPreferences: [...value.locationPreferences, p] }); setLocationInput("") } }} />
          <Button type="button" variant="outline" className="rounded-xl" onClick={() => { const p = locationInput.trim(); if (p) onChange({ ...value, locationPreferences: [...value.locationPreferences, p] }); setLocationInput("") }}>Add</Button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {value.locationPreferences.map((d) => (
            <Badge key={d} variant="secondary" className="gap-1 font-normal">
              {d}
              <button type="button" aria-label={`Remove ${d}`} onClick={() => onChange({ ...value, locationPreferences: value.locationPreferences.filter((x) => x !== d) })}><X className="h-3 w-3" /></button>
            </Badge>
          ))}
        </div>
      </div>
    </div>
  )
}
