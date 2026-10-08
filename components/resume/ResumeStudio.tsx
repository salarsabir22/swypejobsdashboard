"use client"

import { useMemo, useRef, useState } from "react"
import { Download, FileJson, FileText, Plus, Sparkles, Trash2, Upload } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/lib/hooks/use-toast"
import { draftCoverLetter, newCoverLetter } from "@/lib/resume/cover-letter"
import { mergeResumeWithProfile, type ResumeProfileSeed } from "@/lib/resume/from-profile"
import { downloadPdfBytes, renderCoverLetterPdf, renderResumePdf, slugName } from "@/lib/resume/pdf"
import { saveResumeDocuments, uploadResumePdf } from "@/lib/resume/persist"
import {
  newId,
  parseCoverLetters,
  parseResume,
  toJsonResumeFile,
  type CoverLetter,
  type JsonResume,
} from "@/lib/resume/schema"
import { CoverLetterPreview, ResumePreview } from "@/components/resume/ResumePreview"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

export function ResumeStudio({
  userId,
  seed,
  initialResume,
  initialLetters,
  initialTab = "resume",
  prefillRole,
  prefillCompany,
}: {
  userId: string
  seed: ResumeProfileSeed
  initialResume: JsonResume | null
  initialLetters: CoverLetter[]
  initialTab?: "resume" | "letter"
  prefillRole?: string
  prefillCompany?: string
}) {
  const cacheKey = `swype-resume-${userId}`
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [tab, setTab] = useState(initialTab)
  const [resume, setResume] = useState<JsonResume>(() => {
    let local: JsonResume | null = null
    try {
      const cached = typeof window !== "undefined" ? window.localStorage.getItem(cacheKey) : null
      if (cached) local = parseResume(JSON.parse(cached).resume)
    } catch {
      local = null
    }
    return mergeResumeWithProfile(initialResume || local || parseResume(null), seed)
  })
  const [letters, setLetters] = useState<CoverLetter[]>(() => {
    if (initialLetters.length) return initialLetters
    try {
      const cached = typeof window !== "undefined" ? window.localStorage.getItem(cacheKey) : null
      const local = cached ? parseCoverLetters(JSON.parse(cached).letters) : []
      if (local.length) return local
    } catch {
      /* ignore */
    }
    if (prefillRole || prefillCompany) {
      const draft = newCoverLetter({ role: prefillRole, company: prefillCompany })
      draft.body = draftCoverLetter({ resume: mergeResumeWithProfile(initialResume || parseResume(null), seed), company: prefillCompany, role: prefillRole })
      return [draft]
    }
    return []
  })
  const [activeId, setActiveId] = useState(letters[0]?.id || "")
  const [busy, setBusy] = useState<string | null>(null)

  const letter = useMemo(() => letters.find((item) => item.id === activeId) || letters[0] || null, [letters, activeId])

  const patchBasics = (patch: Partial<JsonResume["basics"]>) => {
    setResume((prev) => ({ ...prev, basics: { ...prev.basics, ...patch } }))
  }

  const save = async (alsoPdf: boolean) => {
    setBusy(alsoPdf ? "profile" : "save")
    try {
      const supabase = createClient()
      let path: string | undefined
      if (alsoPdf) {
        const bytes = await renderResumePdf(resume)
        path = await uploadResumePdf(supabase, userId, bytes)
      }
      try {
        window.localStorage.setItem(cacheKey, JSON.stringify({ resume, letters }))
      } catch {
        /* ignore quota */
      }
      const result = await saveResumeDocuments(supabase, userId, resume, letters, path)
      if (!result.ok && alsoPdf) throw new Error(result.message)
      if (!result.ok && !alsoPdf) {
        toast({ title: "Draft saved on this device", description: "Cloud drafts need the resume_document column. Your PDF can still be published with Use as profile CV." })
        return
      }
      toast({
        title: alsoPdf ? "Resume saved to your profile" : "Draft saved",
        description: result.persistedJson
          ? "Recruiters will see the PDF on your applications."
          : "PDF is on your profile. Editable drafts are also kept on this device until the resume SQL migration is applied.",
      })
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Could not save",
        description: err instanceof Error ? err.message : "Try again.",
      })
    } finally {
      setBusy(null)
    }
  }

  const downloadResume = async () => {
    setBusy("pdf")
    try {
      const bytes = await renderResumePdf(resume)
      downloadPdfBytes(bytes, `${slugName(resume.basics.name || "resume")}-resume.pdf`)
    } finally {
      setBusy(null)
    }
  }

  const downloadLetter = async () => {
    if (!letter?.body.trim()) {
      toast({ variant: "destructive", title: "Write a letter first" })
      return
    }
    setBusy("letter-pdf")
    try {
      const bytes = await renderCoverLetterPdf(letter, resume.basics.name)
      downloadPdfBytes(bytes, `${slugName(letter.title || "cover-letter")}.pdf`)
    } finally {
      setBusy(null)
    }
  }

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(toJsonResumeFile(resume), null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${slugName(resume.basics.name || "resume")}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importJson = async (file: File) => {
    try {
      const parsed = parseResume(JSON.parse(await file.text()))
      setResume(mergeResumeWithProfile(parsed, seed))
      toast({ title: "JSON Resume imported" })
    } catch {
      toast({ variant: "destructive", title: "That file is not a JSON Resume" })
    }
  }

  const updateLetter = (patch: Partial<CoverLetter>) => {
    if (!letter) return
    setLetters((prev) =>
      prev.map((item) => (item.id === letter.id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item))
    )
  }

  const addLetter = (generate: boolean) => {
    const next = newCoverLetter({ role: prefillRole, company: prefillCompany })
    if (generate) next.body = draftCoverLetter({ resume, company: next.company || prefillCompany, role: next.role || prefillRole })
    setLetters((prev) => [next, ...prev].slice(0, 8))
    setActiveId(next.id)
    setTab("letter")
  }

  return (
    <div className="space-y-6">
      <Tabs value={tab} onValueChange={(value) => setTab(value as "resume" | "letter")}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <TabsList>
            <TabsTrigger value="resume">Resume</TabsTrigger>
            <TabsTrigger value="letter">Cover letter</TabsTrigger>
          </TabsList>
          {tab === "resume" ? (
            <div className="flex flex-wrap gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void importJson(file)
                  e.target.value = ""
                }}
              />
              <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => fileRef.current?.click()}>
                <Upload className="h-4 w-4" />
                Import JSON
              </Button>
              <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={exportJson}>
                <FileJson className="h-4 w-4" />
                Export JSON
              </Button>
              <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => void downloadResume()} disabled={busy !== null}>
                <Download className="h-4 w-4" />
                PDF
              </Button>
              <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => void save(false)} disabled={busy !== null}>
                {busy === "save" ? "Saving…" : "Save draft"}
              </Button>
              <Button type="button" size="sm" className="rounded-full" onClick={() => void save(true)} disabled={busy !== null}>
                <FileText className="h-4 w-4" />
                {busy === "profile" ? "Saving…" : "Use as profile CV"}
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => addLetter(true)}>
                <Sparkles className="h-4 w-4" />
                Draft from profile
              </Button>
              <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => void downloadLetter()} disabled={busy !== null}>
                <Download className="h-4 w-4" />
                PDF
              </Button>
              <Button type="button" size="sm" className="rounded-full" onClick={() => void save(false)} disabled={busy !== null}>
                {busy === "save" ? "Saving…" : "Save letters"}
              </Button>
            </div>
          )}
        </div>

        <TabsContent value="resume" className="mt-6">
          <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
            <div className="space-y-6">
              <section className="space-y-3">
                <p className="text-[15px] font-semibold tracking-[-0.02em]">Basics</p>
                <Field label="Full name">
                  <Input value={resume.basics.name} onChange={(e) => patchBasics({ name: e.target.value })} />
                </Field>
                <Field label="Headline">
                  <Input
                    value={resume.basics.label || ""}
                    onChange={(e) => patchBasics({ label: e.target.value })}
                    placeholder="Computer Science student"
                  />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Email">
                    <Input value={resume.basics.email || ""} onChange={(e) => patchBasics({ email: e.target.value })} />
                  </Field>
                  <Field label="Phone">
                    <Input value={resume.basics.phone || ""} onChange={(e) => patchBasics({ phone: e.target.value })} />
                  </Field>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="City">
                    <Input
                      value={resume.basics.location?.city || ""}
                      onChange={(e) => patchBasics({ location: { ...resume.basics.location, city: e.target.value } })}
                    />
                  </Field>
                  <Field label="Website">
                    <Input value={resume.basics.url || ""} onChange={(e) => patchBasics({ url: e.target.value })} />
                  </Field>
                </div>
                <Field label="Summary">
                  <Textarea
                    rows={4}
                    value={resume.basics.summary || ""}
                    onChange={(e) => patchBasics({ summary: e.target.value })}
                    placeholder="Two or three sentences about what you want next."
                  />
                </Field>
              </section>

              <EditorList
                title="Education"
                addLabel="Add school"
                items={resume.education}
                onAdd={() =>
                  setResume((prev) => ({
                    ...prev,
                    education: [
                      ...prev.education,
                      { id: newId(), institution: seed.university || "", studyType: seed.degree || "", endDate: seed.graduationYear ? String(seed.graduationYear) : "" },
                    ],
                  }))
                }
                onRemove={(id) => setResume((prev) => ({ ...prev, education: prev.education.filter((row) => row.id !== id) }))}
                renderItem={(edu) => (
                  <div className="grid gap-3">
                    <Input
                      placeholder="University"
                      value={edu.institution}
                      onChange={(e) =>
                        setResume((prev) => ({
                          ...prev,
                          education: prev.education.map((row) => (row.id === edu.id ? { ...row, institution: e.target.value } : row)),
                        }))
                      }
                    />
                    <Input
                      placeholder="Degree / field"
                      value={edu.studyType || ""}
                      onChange={(e) =>
                        setResume((prev) => ({
                          ...prev,
                          education: prev.education.map((row) => (row.id === edu.id ? { ...row, studyType: e.target.value } : row)),
                        }))
                      }
                    />
                    <Input
                      placeholder="Graduation year"
                      value={edu.endDate || ""}
                      onChange={(e) =>
                        setResume((prev) => ({
                          ...prev,
                          education: prev.education.map((row) => (row.id === edu.id ? { ...row, endDate: e.target.value } : row)),
                        }))
                      }
                    />
                  </div>
                )}
              />

              <EditorList
                title="Experience"
                addLabel="Add role"
                items={resume.work}
                onAdd={() =>
                  setResume((prev) => ({
                    ...prev,
                    work: [...prev.work, { id: newId(), name: "", position: "", startDate: "", endDate: "", summary: "", highlights: [] }],
                  }))
                }
                onRemove={(id) => setResume((prev) => ({ ...prev, work: prev.work.filter((row) => row.id !== id) }))}
                renderItem={(job) => (
                  <div className="grid gap-3">
                    <Input
                      placeholder="Title"
                      value={job.position}
                      onChange={(e) =>
                        setResume((prev) => ({
                          ...prev,
                          work: prev.work.map((row) => (row.id === job.id ? { ...row, position: e.target.value } : row)),
                        }))
                      }
                    />
                    <Input
                      placeholder="Company / org"
                      value={job.name}
                      onChange={(e) =>
                        setResume((prev) => ({
                          ...prev,
                          work: prev.work.map((row) => (row.id === job.id ? { ...row, name: e.target.value } : row)),
                        }))
                      }
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        placeholder="Start"
                        value={job.startDate || ""}
                        onChange={(e) =>
                          setResume((prev) => ({
                            ...prev,
                            work: prev.work.map((row) => (row.id === job.id ? { ...row, startDate: e.target.value } : row)),
                          }))
                        }
                      />
                      <Input
                        placeholder="End / Present"
                        value={job.endDate || ""}
                        onChange={(e) =>
                          setResume((prev) => ({
                            ...prev,
                            work: prev.work.map((row) => (row.id === job.id ? { ...row, endDate: e.target.value } : row)),
                          }))
                        }
                      />
                    </div>
                    <Textarea
                      rows={3}
                      placeholder="What you did"
                      value={job.summary || ""}
                      onChange={(e) =>
                        setResume((prev) => ({
                          ...prev,
                          work: prev.work.map((row) => (row.id === job.id ? { ...row, summary: e.target.value } : row)),
                        }))
                      }
                    />
                  </div>
                )}
              />

              <EditorList
                title="Projects"
                addLabel="Add project"
                items={resume.projects}
                onAdd={() =>
                  setResume((prev) => ({
                    ...prev,
                    projects: [...prev.projects, { id: newId(), name: "", description: "", url: "" }],
                  }))
                }
                onRemove={(id) => setResume((prev) => ({ ...prev, projects: prev.projects.filter((row) => row.id !== id) }))}
                renderItem={(project) => (
                  <div className="grid gap-3">
                    <Input
                      placeholder="Project name"
                      value={project.name}
                      onChange={(e) =>
                        setResume((prev) => ({
                          ...prev,
                          projects: prev.projects.map((row) => (row.id === project.id ? { ...row, name: e.target.value } : row)),
                        }))
                      }
                    />
                    <Input
                      placeholder="Link"
                      value={project.url || ""}
                      onChange={(e) =>
                        setResume((prev) => ({
                          ...prev,
                          projects: prev.projects.map((row) => (row.id === project.id ? { ...row, url: e.target.value } : row)),
                        }))
                      }
                    />
                    <Textarea
                      rows={3}
                      placeholder="What it is"
                      value={project.description || ""}
                      onChange={(e) =>
                        setResume((prev) => ({
                          ...prev,
                          projects: prev.projects.map((row) => (row.id === project.id ? { ...row, description: e.target.value } : row)),
                        }))
                      }
                    />
                  </div>
                )}
              />

              <section className="space-y-3">
                <p className="text-[15px] font-semibold tracking-[-0.02em]">Skills</p>
                <Input
                  placeholder="Type a skill and press Enter"
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return
                    e.preventDefault()
                    const value = e.currentTarget.value.trim()
                    if (!value) return
                    setResume((prev) =>
                      prev.skills.some((s) => s.name.toLowerCase() === value.toLowerCase())
                        ? prev
                        : { ...prev, skills: [...prev.skills, { name: value }] }
                    )
                    e.currentTarget.value = ""
                  }}
                />
                <div className="flex flex-wrap gap-2">
                  {resume.skills.map((skill) => (
                    <button
                      key={skill.name}
                      type="button"
                      className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-[12px] font-medium text-foreground"
                      onClick={() => setResume((prev) => ({ ...prev, skills: prev.skills.filter((s) => s.name !== skill.name) }))}
                    >
                      {skill.name}
                      <Trash2 className="h-3 w-3 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </section>
            </div>
            <div className="min-w-0">
              <p className="mb-3 text-[13px] text-muted-foreground">Live preview · ATS-friendly single column</p>
              <ResumePreview resume={resume} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="letter" className="mt-6">
          <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {letters.map((item) => (
                  <Button
                    key={item.id}
                    type="button"
                    size="sm"
                    variant={item.id === letter?.id ? "secondary" : "outline"}
                    className="rounded-full"
                    onClick={() => setActiveId(item.id)}
                  >
                    {item.title || "Untitled"}
                  </Button>
                ))}
                <Button type="button" size="sm" variant="ghost" className="rounded-full" onClick={() => addLetter(false)}>
                  <Plus className="h-4 w-4" />
                  New
                </Button>
              </div>
              {letter ? (
                <>
                  <Field label="Title">
                    <Input value={letter.title} onChange={(e) => updateLetter({ title: e.target.value })} />
                  </Field>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Role">
                      <Input value={letter.role} onChange={(e) => updateLetter({ role: e.target.value })} />
                    </Field>
                    <Field label="Company">
                      <Input value={letter.company} onChange={(e) => updateLetter({ company: e.target.value })} />
                    </Field>
                  </div>
                  <Field label="Letter">
                    <Textarea rows={16} value={letter.body} onChange={(e) => updateLetter({ body: e.target.value })} />
                  </Field>
                  {letters.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => {
                        const next = letters.filter((item) => item.id !== letter.id)
                        setLetters(next)
                        setActiveId(next[0]?.id || "")
                      }}
                    >
                      Delete this letter
                    </Button>
                  ) : null}
                </>
              ) : (
                <p className="text-[15px] text-muted-foreground">
                  Create a letter, or generate a first draft from your profile.
                </p>
              )}
            </div>
            <div className="min-w-0">
              <CoverLetterPreview
                body={letter?.body || ""}
                name={resume.basics.name}
                role={letter?.role}
                company={letter?.company}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function EditorList<T extends { id: string }>({
  title,
  addLabel,
  items,
  onAdd,
  onRemove,
  renderItem,
}: {
  title: string
  addLabel: string
  items: T[]
  onAdd: () => void
  onRemove: (id: string) => void
  renderItem: (item: T) => React.ReactNode
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[15px] font-semibold tracking-[-0.02em]">{title}</p>
        <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={onAdd}>
          <Plus className="h-4 w-4" />
          {addLabel}
        </Button>
      </div>
      {items.map((item) => (
        <div key={item.id} className="space-y-3 rounded-2xl border border-border bg-secondary/40 p-4">
          <div className="flex justify-end">
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label="Remove" onClick={() => onRemove(item.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          {renderItem(item)}
        </div>
      ))}
    </section>
  )
}
