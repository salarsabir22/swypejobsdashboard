"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Briefcase, FolderGit2, Award, Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/lib/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { moveById } from "@/lib/resume/schema"
import { ExperienceList } from "@/components/profile/ExperienceList"
import {
  emptyCertification,
  emptyProject,
  serializeCareerHistory,
  validateWorkHistory,
  type CareerHistory,
  type CertificationEntry,
  type ProjectEntry,
} from "@/lib/profile/career"

export function CareerHistoryEditor({ userId, initial }: { userId: string; initial: CareerHistory }) {
  const router = useRouter()
  const { toast } = useToast()
  const [history, setHistory] = useState<CareerHistory>(initial)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  const update = (patch: Partial<CareerHistory>) => {
    setHistory((prev) => ({ ...prev, ...patch }))
    setDirty(true)
  }

  const patchProject = (id: string, patch: Partial<ProjectEntry>) =>
    update({ projects: history.projects.map((p) => (p.id === id ? { ...p, ...patch } : p)) })
  const patchCert = (id: string, patch: Partial<CertificationEntry>) =>
    update({ certifications: history.certifications.map((c) => (c.id === id ? { ...c, ...patch } : c)) })

  const save = async () => {
    const invalid = validateWorkHistory(history.work)
    if (invalid) {
      toast({ variant: "destructive", title: "Check your experience", description: invalid })
      return
    }
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from("student_profiles").update(serializeCareerHistory(history)).eq("id", userId)
    setSaving(false)
    if (error) {
      const missing = /work_history|projects|certifications/i.test(error.message) && /column/i.test(error.message)
      toast({
        variant: "destructive",
        title: "Couldn’t save",
        description: missing ? "The career history migration hasn’t been applied to the database yet." : error.message,
      })
      return
    }
    setDirty(false)
    toast({ title: "Saved", description: "Recruiters see the updated history on your profile." })
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Work, internships, projects, fellowships */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-lg">
            <Briefcase className="h-4 w-4 text-muted-foreground" /> Professional experience
          </CardTitle>
          <CardDescription>
            Jobs, internships, projects, and fellowships. Most recent first — tick “I currently work here” for your
            present role.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ExperienceList entries={history.work} onChange={(work) => update({ work })} />
        </CardContent>
      </Card>

      {/* Projects */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-lg">
            <FolderGit2 className="h-4 w-4 text-muted-foreground" /> Projects & portfolio
          </CardTitle>
          <CardDescription>Coursework, side projects, competitions. Add a link where you can.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {history.projects.map((p, index) => (
            <div key={p.id} className="space-y-3 rounded-2xl border border-border bg-secondary/40 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[13px] font-medium text-muted-foreground">Project {index + 1}</p>
                <RowControls
                  onUp={() => update({ projects: moveById(history.projects, p.id, -1) })}
                  onDown={() => update({ projects: moveById(history.projects, p.id, 1) })}
                  onRemove={() => update({ projects: history.projects.filter((x) => x.id !== p.id) })}
                  first={index === 0}
                  last={index === history.projects.length - 1}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Name">
                  <Input value={p.name} onChange={(e) => patchProject(p.id, { name: e.target.value })} placeholder="e.g. Campus marketplace app" />
                </Field>
                <Field label="Link (optional)">
                  <Input value={p.url || ""} onChange={(e) => patchProject(p.id, { url: e.target.value })} placeholder="https://" inputMode="url" />
                </Field>
              </div>
              <Field label="Description (optional)">
                <Textarea
                  rows={3}
                  value={p.description || ""}
                  onChange={(e) => patchProject(p.id, { description: e.target.value })}
                  placeholder="What it does, your role, and the result."
                  className="rounded-xl"
                />
              </Field>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={() => update({ projects: [...history.projects, emptyProject()] })}>
            <Plus className="h-4 w-4" /> Add project
          </Button>
        </CardContent>
      </Card>

      {/* Certifications */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-heading text-lg">
            <Award className="h-4 w-4 text-muted-foreground" /> Certifications
          </CardTitle>
          <CardDescription>Professional certificates, MOOCs, licences.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {history.certifications.map((c, index) => (
            <div key={c.id} className="space-y-3 rounded-2xl border border-border bg-secondary/40 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[13px] font-medium text-muted-foreground">Certificate {index + 1}</p>
                <RowControls
                  onUp={() => update({ certifications: moveById(history.certifications, c.id, -1) })}
                  onDown={() => update({ certifications: moveById(history.certifications, c.id, 1) })}
                  onRemove={() => update({ certifications: history.certifications.filter((x) => x.id !== c.id) })}
                  first={index === 0}
                  last={index === history.certifications.length - 1}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Name">
                  <Input value={c.name} onChange={(e) => patchCert(c.id, { name: e.target.value })} placeholder="e.g. Google Data Analytics" />
                </Field>
                <Field label="Issuer (optional)">
                  <Input value={c.issuer || ""} onChange={(e) => patchCert(c.id, { issuer: e.target.value })} placeholder="e.g. Coursera, ACCA" />
                </Field>
                <Field label="Date (optional)">
                  <Input type="month" value={c.date || ""} onChange={(e) => patchCert(c.id, { date: e.target.value || undefined })} />
                </Field>
              </div>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={() => update({ certifications: [...history.certifications, emptyCertification()] })}
          >
            <Plus className="h-4 w-4" /> Add certification
          </Button>
        </CardContent>
      </Card>

      <div className="sticky bottom-20 z-10 flex justify-end lg:bottom-4">
        <Button type="button" className="h-12 rounded-xl px-6 shadow-lg" onClick={() => void save()} loading={saving} loadingText="Saving…" disabled={!dirty && !saving}>
          Save changes
        </Button>
      </div>
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

function RowControls({
  onUp,
  onDown,
  onRemove,
  first,
  last,
}: {
  onUp: () => void
  onDown: () => void
  onRemove: () => void
  first: boolean
  last: boolean
}) {
  return (
    <div className="flex items-center gap-1">
      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label="Move up" onClick={onUp} disabled={first}>
        <ArrowUp className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label="Move down" onClick={onDown} disabled={last}>
        <ArrowDown className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label="Remove" onClick={onRemove}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}
