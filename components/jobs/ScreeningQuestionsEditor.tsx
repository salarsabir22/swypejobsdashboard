"use client"

import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { ScreeningQuestion, ScreeningQuestionType } from "@/lib/jobs/screening"

const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8] as const

export function ScreeningQuestionsEditor({
  questions,
  onChange,
  requiredSemesters,
  onSemestersChange,
}: {
  questions: ScreeningQuestion[]
  onChange: (next: ScreeningQuestion[]) => void
  requiredSemesters: number[]
  onSemestersChange: (next: number[]) => void
}) {
  const addQuestion = () => {
    onChange([
      ...questions,
      {
        id: crypto.randomUUID(),
        prompt: "",
        type: "text",
        required: true,
      },
    ])
  }

  const update = (id: string, patch: Partial<ScreeningQuestion>) => {
    onChange(questions.map((q) => (q.id === id ? { ...q, ...patch } : q)))
  }

  const toggleSemester = (n: number) => {
    onSemestersChange(
      requiredSemesters.includes(n) ? requiredSemesters.filter((s) => s !== n) : [...requiredSemesters, n].sort((a, b) => a - b)
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div>
          <Label>Application questions</Label>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Asked after a candidate swipes right. Mark a question mandatory if they must answer it to apply.
          </p>
        </div>
        <div className="space-y-3">
          {questions.map((q, index) => (
            <div key={q.id} className="space-y-3 rounded-2xl border border-border bg-secondary/40 p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-[13px] font-medium text-muted-foreground">Question {index + 1}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label="Remove question"
                  onClick={() => onChange(questions.filter((row) => row.id !== q.id))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <Input
                value={q.prompt}
                onChange={(e) => update(q.id, { prompt: e.target.value })}
                placeholder="e.g. How would you tackle this situation?"
              />
              <div className="flex flex-wrap items-center gap-3">
                <Select
                  value={q.type}
                  onValueChange={(value) => update(q.id, { type: value as ScreeningQuestionType })}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Written answer</SelectItem>
                    <SelectItem value="video">Video (90 sec)</SelectItem>
                  </SelectContent>
                </Select>
                <label className="flex items-center gap-2 text-[13px] font-medium">
                  <input
                    type="checkbox"
                    className="size-4 accent-[var(--primary)]"
                    checked={q.required}
                    onChange={(e) => update(q.id, { required: e.target.checked })}
                  />
                  Mandatory
                </label>
              </div>
            </div>
          ))}
        </div>
        <Button type="button" variant="outline" onClick={addQuestion}>
          <Plus className="h-4 w-4" />
          Add a question
        </Button>
      </div>

      <div className="space-y-3">
        <div>
          <Label>Semester requirement</Label>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Leave empty for every enrolled student. Tick 7 and 8 to hide this role from earlier semesters.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {SEMESTERS.map((n) => {
            const on = requiredSemesters.includes(n)
            return (
              <Button
                key={n}
                type="button"
                variant={on ? "default" : "outline"}
                size="sm"
                onClick={() => toggleSemester(n)}
              >
                {n}
              </Button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
