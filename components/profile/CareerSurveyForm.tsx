"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/lib/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  EMPLOYMENT_LABEL,
  EMPLOYMENT_STATUSES,
  RELATED_OPTIONS,
  isWorking,
  surveyFromRow,
  type CareerSurvey,
  type EmploymentStatus,
  type RelatedToDegree,
} from "@/lib/profile/survey"

const YEARS = [0, 1, 2, 3].map((n) => new Date().getFullYear() - n)

export function CareerSurveyForm({
  userId,
  initialRows,
}: {
  userId: string
  initialRows: Record<string, unknown>[]
}) {
  const { toast } = useToast()
  const [rows, setRows] = useState(initialRows)
  const byYear = new Map(rows.map((row) => [Number(row.survey_year), row]))
  const [year, setYear] = useState(YEARS[0])
  const [form, setForm] = useState<CareerSurvey>(surveyFromRow(byYear.get(YEARS[0]), YEARS[0]))
  const [saving, setSaving] = useState(false)

  const pickYear = (next: number) => {
    setYear(next)
    setForm(surveyFromRow(byYear.get(next), next))
  }

  const set = <K extends keyof CareerSurvey>(key: K, value: CareerSurvey[K]) => setForm((prev) => ({ ...prev, [key]: value }))

  const save = async () => {
    if (isWorking(form.employmentStatus) && !form.employer.trim()) {
      toast({ variant: "destructive", title: "Add your employer" })
      return
    }
    if (form.employmentStatus === "further_study" && !form.furtherStudy.trim()) {
      toast({ variant: "destructive", title: "Add the program you’re studying" })
      return
    }
    const salary = form.salaryPkr.trim() ? Number(form.salaryPkr.replace(/,/g, "")) : null
    if (salary !== null && (!Number.isFinite(salary) || salary < 0)) {
      toast({ variant: "destructive", title: "Salary should be a number in PKR" })
      return
    }
    const satisfaction = form.satisfaction.trim() ? Number(form.satisfaction) : null
    setSaving(true)
    const supabase = createClient()
    const payload = {
      student_id: userId,
      survey_year: year,
      employment_status: form.employmentStatus,
      employer: isWorking(form.employmentStatus) ? form.employer.trim() || null : null,
      designation: isWorking(form.employmentStatus) ? form.designation.trim() || null : null,
      industry: isWorking(form.employmentStatus) ? form.industry.trim() || null : null,
      salary_pkr: isWorking(form.employmentStatus) ? salary : null,
      related_to_degree: isWorking(form.employmentStatus) ? form.relatedToDegree || null : null,
      satisfaction,
      further_study: form.employmentStatus === "further_study" ? form.furtherStudy.trim() || null : null,
      comments: form.comments.trim() || null,
      submitted_at: new Date().toISOString(),
    }
    const { error } = await supabase.from("career_surveys").upsert(payload, { onConflict: "student_id,survey_year" })
    setSaving(false)
    if (error) {
      const missing = /career_surveys/i.test(error.message) && /relation|schema|does not exist/i.test(error.message)
      toast({
        variant: "destructive",
        title: "Couldn’t save survey",
        description: missing ? "Run the career_surveys migration in Supabase first." : error.message,
      })
      return
    }
    setRows((prev) => [...prev.filter((row) => Number(row.survey_year) !== year), payload])
    toast({ title: `${year} survey saved` })
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <Label htmlFor="survey-year">Survey year</Label>
        <select
          id="survey-year"
          className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
          value={year}
          onChange={(e) => pickYear(Number(e.target.value))}
        >
          {YEARS.map((y) => (
            <option key={y} value={y}>
              {y}
              {byYear.has(y) ? " · submitted" : ""}
            </option>
          ))}
        </select>
        <p className="text-[13px] text-muted-foreground">
          One response per year. The Career Development Center uses this for HEC placement and NBEAC employment reports. It is labeled self-reported.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="survey-status">What best describes you this year?</Label>
        <select
          id="survey-status"
          className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
          value={form.employmentStatus}
          onChange={(e) => set("employmentStatus", e.target.value as EmploymentStatus)}
        >
          {EMPLOYMENT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {EMPLOYMENT_LABEL[status]}
            </option>
          ))}
        </select>
      </div>

      {isWorking(form.employmentStatus) ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="survey-employer">Employer</Label>
            <Input id="survey-employer" value={form.employer} onChange={(e) => set("employer", e.target.value)} placeholder="Company or practice name" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="survey-role">Designation</Label>
            <Input id="survey-role" value={form.designation} onChange={(e) => set("designation", e.target.value)} placeholder="e.g. Analyst" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="survey-industry">Industry</Label>
            <Input id="survey-industry" value={form.industry} onChange={(e) => set("industry", e.target.value)} placeholder="e.g. Banking" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="survey-salary">Monthly salary (PKR, optional)</Label>
            <Input id="survey-salary" inputMode="numeric" value={form.salaryPkr} onChange={(e) => set("salaryPkr", e.target.value)} placeholder="80000" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="survey-related">Related to your degree?</Label>
            <select
              id="survey-related"
              className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
              value={form.relatedToDegree}
              onChange={(e) => set("relatedToDegree", e.target.value as RelatedToDegree | "")}
            >
              <option value="">Prefer not to say</option>
              {RELATED_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option === "yes" ? "Yes" : option === "somewhat" ? "Somewhat" : "No"}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}

      {form.employmentStatus === "further_study" ? (
        <div className="space-y-1.5">
          <Label htmlFor="survey-study">Program and institution</Label>
          <Input id="survey-study" value={form.furtherStudy} onChange={(e) => set("furtherStudy", e.target.value)} placeholder="e.g. MS Finance, LUMS" />
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="survey-satisfaction">Satisfaction with your outcome (1–5, optional)</Label>
        <select
          id="survey-satisfaction"
          className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
          value={form.satisfaction}
          onChange={(e) => set("satisfaction", e.target.value)}
        >
          <option value="">Not answered</option>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="survey-comments">Anything the CDC should know (optional)</Label>
        <Textarea id="survey-comments" rows={3} value={form.comments} onChange={(e) => set("comments", e.target.value)} />
      </div>

      <Button type="button" className="rounded-full" onClick={() => void save()} loading={saving} loadingText="Saving…">
        {byYear.has(year) ? "Update survey" : "Submit survey"}
      </Button>
    </div>
  )
}
