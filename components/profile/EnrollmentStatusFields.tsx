"use client"

import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  SEMESTER_OPTIONS,
  institutionPlaceLabel,
  type InstitutionType,
} from "@/lib/profile/enrollment"

export function EnrollmentStatusFields({
  institutionType,
  stillEnrolled,
  onStillEnrolledChange,
  currentSemester,
  onSemesterChange,
}: {
  institutionType: InstitutionType
  stillEnrolled: boolean
  onStillEnrolledChange: (next: boolean) => void
  currentSemester: string
  onSemesterChange: (next: string) => void
}) {
  const place = institutionPlaceLabel(institutionType)

  return (
    <div className="space-y-3">
      <label className="flex items-start gap-3 rounded-2xl border border-border bg-secondary/40 p-4 text-sm">
        <input
          type="checkbox"
          className="mt-1 size-4 accent-[var(--primary)]"
          checked={stillEnrolled}
          onChange={(e) => {
            onStillEnrolledChange(e.target.checked)
            if (!e.target.checked) onSemesterChange("")
          }}
        />
        <span>
          <span className="font-medium">Are you still in {place}?</span>
          <span className="mt-1 block text-[13px] text-muted-foreground">
            Tick this if you have not graduated yet. Some internships are only shown to 7th and 8th semester students.
          </span>
        </span>
      </label>
      {stillEnrolled ? (
        <div className="space-y-1.5">
          <Label htmlFor="current-semester">What semester are you in?</Label>
          <Select value={currentSemester || undefined} onValueChange={onSemesterChange}>
            <SelectTrigger id="current-semester" className="h-11 rounded-xl">
              <SelectValue placeholder="Select semester…" />
            </SelectTrigger>
            <SelectContent>
              {SEMESTER_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  Semester {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[13px] text-muted-foreground">
            Required. Roles limited to final-year students will stay hidden unless you are in semester 7 or 8.
          </p>
        </div>
      ) : null}
    </div>
  )
}
