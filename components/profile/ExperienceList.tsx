"use client"

import { ArrowDown, ArrowUp, Briefcase, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { moveById } from "@/lib/resume/schema"
import { WORK_KINDS, emptyWork, type WorkEntry, type WorkKind } from "@/lib/profile/career"

/**
 * Repeatable professional experience editor: job title, company, type
 * (full time / internship / project / fellowship), start + end dates, description.
 * Shared by onboarding and Profile → Experience so both stay in sync.
 */
export function ExperienceList({
  entries,
  onChange,
  emptyHint = "No experience yet. Add a role, internship, project, or fellowship.",
}: {
  entries: WorkEntry[]
  onChange: (next: WorkEntry[]) => void
  emptyHint?: string
}) {
  const patch = (id: string, next: Partial<WorkEntry>) =>
    onChange(entries.map((entry) => (entry.id === id ? { ...entry, ...next } : entry)))

  return (
    <div className="space-y-4">
      {entries.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-muted/25 px-4 py-6 text-center font-body text-sm text-muted-foreground">
          {emptyHint}
        </p>
      ) : null}

      {entries.map((entry, index) => (
        <div key={entry.id} className="space-y-3 rounded-2xl border border-border bg-secondary/40 p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground">
              <Briefcase className="h-3.5 w-3.5" aria-hidden />
              Experience {index + 1}
            </p>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Move up"
                onClick={() => onChange(moveById(entries, entry.id, -1))}
                disabled={index === 0}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Move down"
                onClick={() => onChange(moveById(entries, entry.id, 1))}
                disabled={index === entries.length - 1}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Remove experience"
                onClick={() => onChange(entries.filter((item) => item.id !== entry.id))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Job title">
              <Input
                className="rounded-xl"
                value={entry.position}
                onChange={(e) => patch(entry.id, { position: e.target.value })}
                placeholder="e.g. Marketing intern"
              />
            </Field>
            <Field label="Company name">
              <Input
                className="rounded-xl"
                value={entry.name}
                onChange={(e) => patch(entry.id, { name: e.target.value })}
                placeholder="e.g. Engro, HBL, a startup"
              />
            </Field>
            <Field label="Job type">
              <Select
                value={entry.kind}
                onValueChange={(value) => patch(entry.id, { kind: value as WorkKind })}
              >
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WORK_KINDS.map((kind) => (
                    <SelectItem key={kind.value} value={kind.value}>
                      {kind.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start date">
                <Input
                  type="month"
                  className="rounded-xl"
                  value={entry.startDate || ""}
                  onChange={(e) => patch(entry.id, { startDate: e.target.value || undefined })}
                />
              </Field>
              <Field label="End date">
                <Input
                  type="month"
                  className="rounded-xl"
                  value={entry.current ? "" : entry.endDate || ""}
                  disabled={entry.current}
                  onChange={(e) => patch(entry.id, { endDate: e.target.value || undefined })}
                />
              </Field>
            </div>
          </div>

          <label className="flex items-center gap-2 text-[13px] font-medium">
            <input
              type="checkbox"
              className="size-4 accent-[var(--primary)]"
              checked={entry.current}
              onChange={(e) => patch(entry.id, { current: e.target.checked, endDate: undefined })}
            />
            I currently work here
          </label>

          <Field label="Description">
            <Textarea
              rows={3}
              className="rounded-xl"
              value={entry.summary || ""}
              onChange={(e) => patch(entry.id, { summary: e.target.value })}
              placeholder="What you owned, shipped, or learned."
            />
          </Field>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        className="rounded-xl"
        onClick={() => onChange([...entries, emptyWork()])}
      >
        <Plus className="h-4 w-4" />
        Add experience
      </Button>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[13px]">{label}</Label>
      {children}
    </div>
  )
}
