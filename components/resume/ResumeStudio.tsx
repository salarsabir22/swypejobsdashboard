"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { formatDistanceToNow } from "date-fns"
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  FileJson,
  FileText,
  MoreHorizontal,
  Plus,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/lib/hooks/use-toast"
import { draftCoverLetter, newCoverLetter, type LetterTone } from "@/lib/resume/cover-letter"
import {
  analyzeResume,
  emptyAward,
  emptyCertificate,
  emptyLanguage,
  matchToJob,
  tailorResume,
  type ResumeTargetJob,
} from "@/lib/resume/insights"
import { mergeResumeWithProfile, resumeFromProfile, type ResumeProfileSeed } from "@/lib/resume/from-profile"
import { downloadPdfBytes, renderCoverLetterPdf, renderResumePdf, slugName } from "@/lib/resume/pdf"
import { saveResumeDocuments, uploadResumePdf } from "@/lib/resume/persist"
import {
  emptyResume,
  newId,
  moveById,
  newResumeRecord,
  parseCoverLetters,
  parseResume,
  parseResumeLibrary,
  toJsonResumeFile,
  type CoverLetter,
  type JsonResume,
  type ResumeRecord,
} from "@/lib/resume/schema"
import { CoverLetterPreview, ResumePreview } from "@/components/resume/ResumePreview"
import { RichTextEditor } from "@/components/resume/RichTextEditor"
import { linesToListHtml, listHtmlToLines } from "@/lib/resume/html"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

const MAX_DOCS = 8

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function profileUrl(resume: JsonResume, network: string) {
  return resume.basics.profiles?.find((p) => p.network.toLowerCase() === network.toLowerCase())?.url || ""
}

function withProfile(resume: JsonResume, network: string, url: string): JsonResume {
  const others = (resume.basics.profiles || []).filter((p) => p.network.toLowerCase() !== network.toLowerCase())
  const profiles = url.trim() ? [...others, { network, url: url.trim() }] : others
  return { ...resume, basics: { ...resume.basics, profiles } }
}

function resumeGaps(resume: JsonResume) {
  const gaps: string[] = []
  if (!resume.basics.name.trim()) gaps.push("Name")
  if (!resume.basics.email?.trim()) gaps.push("Email")
  if (!resume.education.some((e) => e.institution.trim())) gaps.push("Education")
  if (!resume.work.some((j) => j.position || j.name) && !resume.projects.some((p) => p.name)) gaps.push("Experience or a project")
  if (!resume.skills.length) gaps.push("Skills")
  return gaps
}

function relativeTime(iso: string) {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true })
  } catch {
    return ""
  }
}

export function ResumeStudio({
  userId,
  seed,
  initialDocuments,
  initialLetters,
  initialTab = "resume",
  prefillRole,
  prefillCompany,
  targetJobs = [],
}: {
  userId: string
  seed: ResumeProfileSeed
  initialDocuments: ResumeRecord[]
  initialLetters: CoverLetter[]
  initialTab?: "resume" | "letter"
  prefillRole?: string
  prefillCompany?: string
  targetJobs?: ResumeTargetJob[]
}) {
  const cacheKey = `swype-resume-${userId}`
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const hydrated = useRef(false)
  const [tab, setTab] = useState(initialTab)
  const [documents, setDocuments] = useState<ResumeRecord[]>(() => {
    if (initialDocuments.length) {
      return initialDocuments.map((doc) => ({ ...doc, resume: mergeResumeWithProfile(doc.resume, seed) }))
    }
    try {
      const cached = typeof window !== "undefined" ? window.localStorage.getItem(cacheKey) : null
      if (cached) {
        const parsed = JSON.parse(cached) as { documents?: unknown; resume?: unknown }
        const fromLibrary = parseResumeLibrary(parsed.documents ?? parsed.resume)
        if (fromLibrary.length) return fromLibrary.map((doc) => ({ ...doc, resume: mergeResumeWithProfile(doc.resume, seed) }))
      }
    } catch {
      /* ignore */
    }
    return [newResumeRecord(mergeResumeWithProfile(resumeFromProfile(seed), seed), { title: "General" })]
  })
  const [activeResumeId, setActiveResumeId] = useState(documents[0]?.id || "")
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
      const source = documents[0]?.resume || mergeResumeWithProfile(parseResume(null), seed)
      draft.body = draftCoverLetter({ resume: source, company: prefillCompany, role: prefillRole })
      return [draft]
    }
    return []
  })
  const [activeLetterId, setActiveLetterId] = useState(letters[0]?.id || "")
  const [busy, setBusy] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [pendingDelete, setPendingDelete] = useState<{ kind: "resume" | "letter"; id: string } | null>(null)
  const [jobId, setJobId] = useState(targetJobs[0]?.id || "")
  const [jobText, setJobText] = useState(targetJobs[0] ? `${targetJobs[0].title}\n${targetJobs[0].description || ""}` : "")
  const [letterTone, setLetterTone] = useState<LetterTone>("standard")

  const record = documents.find((item) => item.id === activeResumeId) || documents[0] || null
  const resume = record?.resume || emptyResume()
  const letter = useMemo(
    () => letters.find((item) => item.id === activeLetterId) || letters[0] || null,
    [letters, activeLetterId]
  )
  const gaps = record ? resumeGaps(resume) : []
  const selectedJob = targetJobs.find((job) => job.id === jobId)
  const ats = record ? analyzeResume(resume) : null
  const fit = record ? matchToJob(resume, jobText, selectedJob?.skills) : null

  const setResume = (updater: (prev: JsonResume) => JsonResume) => {
    if (!record) return
    setDocuments((prev) =>
      prev.map((doc) =>
        doc.id === record.id ? { ...doc, resume: updater(doc.resume), updatedAt: new Date().toISOString() } : doc
      )
    )
  }

  const patchBasics = (patch: Partial<JsonResume["basics"]>) => {
    setResume((prev) => ({ ...prev, basics: { ...prev.basics, ...patch } }))
  }

  const persistCache = (nextDocuments: ResumeRecord[], nextLetters: CoverLetter[]) => {
    try {
      window.localStorage.setItem(cacheKey, JSON.stringify({ documents: nextDocuments, letters: nextLetters }))
    } catch {
      /* ignore quota */
    }
  }

  useEffect(() => {
    persistCache(documents, letters)
    if (!hydrated.current) {
      hydrated.current = true
      return
    }
    setSaveState("idle")
    const timer = window.setTimeout(async () => {
      setSaveState("saving")
      const supabase = createClient()
      const result = await saveResumeDocuments(supabase, userId, documents, letters)
      setSaveState(result.ok && result.persistedJson ? "saved" : result.ok ? "saved" : "error")
    }, 1200)
    return () => window.clearTimeout(timer)
  }, [documents, letters, userId])

  const saveAsProfile = async () => {
    if (!record) return
    setBusy("profile")
    try {
      const supabase = createClient()
      const bytes = await renderResumePdf(resume)
      const path = await uploadResumePdf(supabase, userId, bytes)
      const nextDocuments = documents.map((doc) => ({ ...doc, isProfile: doc.id === record.id }))
      setDocuments(nextDocuments)
      persistCache(nextDocuments, letters)
      const result = await saveResumeDocuments(supabase, userId, nextDocuments, letters, path)
      if (!result.ok) throw new Error(result.message)
      setSaveState("saved")
      toast({
        title: "This is now your profile CV",
        description: "Recruiters can download it from your applications.",
      })
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Could not publish",
        description: err instanceof Error ? err.message : "Try again.",
      })
    } finally {
      setBusy(null)
    }
  }

  const downloadResume = async () => {
    if (!record) return
    setBusy("pdf")
    try {
      const bytes = await renderResumePdf(resume)
      downloadPdfBytes(bytes, `${slugName(record.title || resume.basics.name || "resume")}-resume.pdf`)
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
    if (!record) return
    const blob = new Blob([JSON.stringify(toJsonResumeFile(resume), null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${slugName(record.title || resume.basics.name || "resume")}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importJson = async (file: File) => {
    try {
      const parsed = parseResume(JSON.parse(await file.text()))
      const next = newResumeRecord(mergeResumeWithProfile(parsed, seed), {
        title: parsed.basics.label || file.name.replace(/\.json$/i, ""),
      })
      if (documents.length >= MAX_DOCS) {
        toast({ variant: "destructive", title: `You can keep up to ${MAX_DOCS} resumes` })
        return
      }
      setDocuments((prev) => [next, ...prev])
      setActiveResumeId(next.id)
      toast({ title: "Imported" })
    } catch {
      toast({ variant: "destructive", title: "That file is not a JSON Resume" })
    }
  }

  const addResume = (fromProfile: boolean) => {
    if (documents.length >= MAX_DOCS) {
      toast({ variant: "destructive", title: `You can keep up to ${MAX_DOCS} resumes` })
      return
    }
    const next = newResumeRecord(
      fromProfile ? mergeResumeWithProfile(resumeFromProfile(seed), seed) : emptyResume(),
      { title: fromProfile ? "From profile" : "Untitled" }
    )
    setDocuments((prev) => [next, ...prev])
    setActiveResumeId(next.id)
    setTab("resume")
  }

  const duplicateResume = () => {
    if (!record) return
    if (documents.length >= MAX_DOCS) {
      toast({ variant: "destructive", title: `You can keep up to ${MAX_DOCS} resumes` })
      return
    }
    const copy = newResumeRecord(structuredClone(record.resume), {
      title: `${record.title} copy`,
      isProfile: false,
    })
    setDocuments((prev) => [copy, ...prev])
    setActiveResumeId(copy.id)
  }

  const updateLetter = (patch: Partial<CoverLetter>) => {
    if (!letter) return
    setLetters((prev) =>
      prev.map((item) => (item.id === letter.id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item))
    )
  }

  const addLetter = (generate: boolean) => {
    if (letters.length >= MAX_DOCS) {
      toast({ variant: "destructive", title: `You can keep up to ${MAX_DOCS} letters` })
      return
    }
    const next = newCoverLetter({ role: prefillRole, company: prefillCompany })
    if (generate) {
      next.body = draftCoverLetter({
        resume,
        company: next.company || prefillCompany,
        role: next.role || prefillRole,
        tone: letterTone,
      })
    }
    setLetters((prev) => [next, ...prev])
    setActiveLetterId(next.id)
    setTab("letter")
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    if (pendingDelete.kind === "resume") {
      const removing = documents.find((doc) => doc.id === pendingDelete.id)
      const next = documents.filter((doc) => doc.id !== pendingDelete.id)
      setDocuments(next)
      setActiveResumeId(next[0]?.id || "")
      persistCache(next, letters)
      const supabase = createClient()
      await saveResumeDocuments(supabase, userId, next, letters, removing?.isProfile ? null : undefined)
    } else {
      const next = letters.filter((item) => item.id !== pendingDelete.id)
      setLetters(next)
      setActiveLetterId(next[0]?.id || "")
      persistCache(documents, next)
      const supabase = createClient()
      await saveResumeDocuments(supabase, userId, documents, next)
    }
    setPendingDelete(null)
  }

  const pendingTitle =
    pendingDelete?.kind === "resume"
      ? documents.find((doc) => doc.id === pendingDelete.id)?.title || "this resume"
      : letters.find((item) => item.id === pendingDelete?.id)?.title || "this letter"

  const saveLabel =
    saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : saveState === "error" ? "Couldn’t save" : "Edits autosave"

  return (
    <div className="space-y-5">
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

      <Tabs value={tab} onValueChange={(value) => setTab(value as "resume" | "letter")}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <TabsList>
              <TabsTrigger value="resume">Resumes</TabsTrigger>
              <TabsTrigger value="letter">Cover letters</TabsTrigger>
            </TabsList>
            <p className={cn("text-[13px] text-muted-foreground", saveState === "error" && "text-destructive")}>{saveLabel}</p>
          </div>
          {tab === "resume" ? (
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => void downloadResume()} disabled={busy !== null || !record}>
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
              <Button type="button" size="sm" className="rounded-full" onClick={() => void saveAsProfile()} disabled={busy !== null || !record}>
                <FileText className="h-4 w-4" />
                {busy === "profile" ? "Publishing…" : record?.isProfile ? "Update profile CV" : "Use as profile CV"}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" size="icon" className="h-9 w-9 rounded-full" aria-label="More resume actions">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onSelect={() => addResume(true)}>
                    <Plus />
                    New from profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => addResume(false)}>
                    <Plus />
                    Blank resume
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={duplicateResume} disabled={!record}>
                    <Copy />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => fileRef.current?.click()}>
                    <Upload />
                    Import JSON
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={exportJson} disabled={!record}>
                    <FileJson />
                    Export JSON
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    disabled={!record}
                    onSelect={() => record && setPendingDelete({ kind: "resume", id: record.id })}
                  >
                    <Trash2 />
                    Delete resume
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => addLetter(true)}>
                <Sparkles className="h-4 w-4" />
                Draft from profile
              </Button>
              <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => void downloadLetter()} disabled={busy !== null || !letter}>
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
            </div>
          )}
        </div>

        <TabsContent value="resume" className="mt-5">
          <div className="grid items-start gap-6 xl:grid-cols-[220px_minmax(0,26rem)_minmax(0,1fr)]">
            <aside className="space-y-2 xl:sticky xl:top-24">
              <p className="px-1 text-[13px] font-semibold tracking-[-0.02em]">Your versions</p>
              <div className="flex gap-2 overflow-x-auto pb-1 xl:flex-col xl:overflow-visible">
                {documents.map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => setActiveResumeId(doc.id)}
                    className={cn(
                      "min-w-[180px] rounded-2xl border px-3 py-3 text-left transition-colors xl:min-w-0",
                      doc.id === record?.id
                        ? "border-primary bg-secondary"
                        : "border-border bg-card hover:border-primary/40"
                    )}
                  >
                    <p className="truncate text-[14px] font-semibold tracking-[-0.02em]">{doc.title || "Untitled"}</p>
                    <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                      {doc.isProfile ? "Profile CV · " : ""}
                      {relativeTime(doc.updatedAt)}
                    </p>
                  </button>
                ))}
              </div>
              <Button type="button" variant="ghost" size="sm" className="w-full justify-start rounded-xl" onClick={() => addResume(true)}>
                <Plus className="h-4 w-4" />
                New resume
              </Button>
            </aside>

            {record ? (
              <>
                <div className="space-y-6">
                  {gaps.length ? (
                    <div className="rounded-2xl border border-border bg-secondary/50 px-4 py-3 text-[13px] text-muted-foreground">
                      Still useful to add: {gaps.join(", ")}.
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 rounded-2xl border border-border bg-secondary/50 px-4 py-3 text-[13px] text-foreground">
                      <Check className="h-4 w-4 text-[var(--lp-mint-ink,#0a7a56)]" />
                      Ready to send — name, education, and skills are in.
                    </div>
                  )}

                  {ats ? (
                    <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="text-[15px] font-semibold tracking-[-0.02em]">ATS check</p>
                        <p className="text-[1.6rem] font-semibold tabular-nums tracking-[-0.04em] text-primary">{ats.score}</p>
                      </div>
                      <ul className="space-y-1.5 text-[13px]">
                        {ats.tips.map((tip) => (
                          <li key={tip.label} className={tip.ok ? "text-muted-foreground" : "text-foreground"}>
                            {tip.ok ? "In: " : "Add: "}
                            {tip.label}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
                    <p className="text-[15px] font-semibold tracking-[-0.02em]">Fit to a role</p>
                    {targetJobs.length ? (
                      <Field label="Saved or applied role">
                        <select
                          className="h-11 w-full rounded-full border border-input bg-background px-4 text-sm"
                          value={jobId}
                          onChange={(e) => {
                            const id = e.target.value
                            setJobId(id)
                            const job = targetJobs.find((item) => item.id === id)
                            if (job) setJobText([job.title, job.company, job.description].filter(Boolean).join("\n"))
                          }}
                        >
                          <option value="">Paste a description instead</option>
                          {targetJobs.map((job) => (
                            <option key={job.id} value={job.id}>
                              {[job.title, job.company].filter(Boolean).join(" · ")}
                            </option>
                          ))}
                        </select>
                      </Field>
                    ) : null}
                    <Field label="Job description">
                      <Textarea
                        rows={5}
                        value={jobText}
                        onChange={(e) => setJobText(e.target.value)}
                        placeholder="Paste a job post. We’ll show matching skills and what’s missing."
                      />
                    </Field>
                    {fit && jobText.trim() ? (
                      <div className="space-y-2 text-[13px]">
                        <p className="text-muted-foreground">{fit.coverage}% of the listed requirements show up on this resume.</p>
                        {fit.matched.length ? <p>You already have: {fit.matched.join(", ")}.</p> : null}
                        {fit.missing.length ? <p>Not on this version: {fit.missing.join(", ")}.</p> : null}
                        <div className="flex flex-wrap gap-2 pt-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="rounded-full"
                            disabled={!fit.missing.length}
                            onClick={() => setResume((prev) => tailorResume(prev, { missing: fit.missing }))}
                          >
                            Add missing skills
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            className="rounded-full"
                            onClick={() => {
                              if (!record) return
                              if (documents.length >= MAX_DOCS) {
                                toast({ variant: "destructive", title: `You can keep up to ${MAX_DOCS} resumes` })
                                return
                              }
                              const job = selectedJob
                              const copy = newResumeRecord(
                                tailorResume(resume, {
                                  missing: fit.missing,
                                  role: job?.title || prefillRole,
                                  company: job?.company || prefillCompany,
                                }),
                                { title: job ? `${job.company || job.title}` : "Tailored" }
                              )
                              setDocuments((prev) => [copy, ...prev])
                              setActiveResumeId(copy.id)
                            }}
                          >
                            Make a tailored copy
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <Field label="Version name">
                    <Input
                      value={record.title}
                      onChange={(e) =>
                        setDocuments((prev) =>
                          prev.map((doc) =>
                            doc.id === record.id ? { ...doc, title: e.target.value, updatedAt: new Date().toISOString() } : doc
                          )
                        )
                      }
                      placeholder="General, internships, data roles…"
                    />
                  </Field>

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
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="LinkedIn">
                        <Input
                          value={profileUrl(resume, "LinkedIn")}
                          onChange={(e) => setResume((prev) => withProfile(prev, "LinkedIn", e.target.value))}
                          placeholder="https://linkedin.com/in/…"
                        />
                      </Field>
                      <Field label="GitHub">
                        <Input
                          value={profileUrl(resume, "GitHub")}
                          onChange={(e) => setResume((prev) => withProfile(prev, "GitHub", e.target.value))}
                          placeholder="https://github.com/…"
                        />
                      </Field>
                    </div>
                    <Field label="Summary">
                      <RichTextEditor
                        value={resume.basics.summary || ""}
                        onChange={(html) => patchBasics({ summary: html })}
                        placeholder="Two or three sentences about what you want next."
                        minHeight={110}
                      />
                    </Field>
                  </section>

                  <EditorList
                    title="Education"
                    addLabel="Add school"
                    items={resume.education}
                    onMove={(id, direction) => setResume((prev) => ({ ...prev, education: moveById(prev.education, id, direction) }))}
                    onAdd={() =>
                      setResume((prev) => ({
                        ...prev,
                        education: [
                          ...prev.education,
                          {
                            id: newId(),
                            institution: seed.university || "",
                            studyType: seed.degree || "",
                            endDate: seed.graduationYear ? String(seed.graduationYear) : "",
                          },
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
                          placeholder="Degree"
                          value={edu.studyType || ""}
                          onChange={(e) =>
                            setResume((prev) => ({
                              ...prev,
                              education: prev.education.map((row) => (row.id === edu.id ? { ...row, studyType: e.target.value } : row)),
                            }))
                          }
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <Input
                            placeholder="Field"
                            value={edu.area || ""}
                            onChange={(e) =>
                              setResume((prev) => ({
                                ...prev,
                                education: prev.education.map((row) => (row.id === edu.id ? { ...row, area: e.target.value } : row)),
                              }))
                            }
                          />
                          <Input
                            placeholder="Year"
                            value={edu.endDate || ""}
                            onChange={(e) =>
                              setResume((prev) => ({
                                ...prev,
                                education: prev.education.map((row) => (row.id === edu.id ? { ...row, endDate: e.target.value } : row)),
                              }))
                            }
                          />
                        </div>
                      </div>
                    )}
                  />

                  <EditorList
                    title="Experience"
                    addLabel="Add role"
                    items={resume.work}
                    onMove={(id, direction) => setResume((prev) => ({ ...prev, work: moveById(prev.work, id, direction) }))}
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
                        <RichTextEditor
                          key={`${job.id}-summary`}
                          value={job.summary || ""}
                          onChange={(html) =>
                            setResume((prev) => ({
                              ...prev,
                              work: prev.work.map((row) => (row.id === job.id ? { ...row, summary: html } : row)),
                            }))
                          }
                          placeholder="One-line summary"
                          minHeight={88}
                        />
                        <RichTextEditor
                          key={`${job.id}-highlights`}
                          value={linesToListHtml(job.highlights || [])}
                          onChange={(html) =>
                            setResume((prev) => ({
                              ...prev,
                              work: prev.work.map((row) =>
                                row.id === job.id ? { ...row, highlights: listHtmlToLines(html) } : row
                              ),
                            }))
                          }
                          placeholder="Achievements — use the bullet button"
                          minHeight={120}
                        />
                      </div>
                    )}
                  />

                  <EditorList
                    title="Projects"
                    addLabel="Add project"
                    items={resume.projects}
                    onMove={(id, direction) => setResume((prev) => ({ ...prev, projects: moveById(prev.projects, id, direction) }))}
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
                        <RichTextEditor
                          key={`${project.id}-description`}
                          value={project.description || ""}
                          onChange={(html) =>
                            setResume((prev) => ({
                              ...prev,
                              projects: prev.projects.map((row) =>
                                row.id === project.id ? { ...row, description: html } : row
                              ),
                            }))
                          }
                          placeholder="What it is"
                          minHeight={96}
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
                      {(resume.skills || []).map((skill) => (
                        <button
                          key={skill.name}
                          type="button"
                          className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-[13px] font-medium text-foreground"
                          onClick={() => setResume((prev) => ({ ...prev, skills: prev.skills.filter((s) => s.name !== skill.name) }))}
                        >
                          {skill.name}
                          <Trash2 className="h-3 w-3 text-muted-foreground" />
                        </button>
                      ))}
                    </div>
                  </section>

                  <EditorList
                    title="Languages"
                    addLabel="Add language"
                    items={resume.languages || []}
                    onMove={(id, direction) =>
                      setResume((prev) => ({ ...prev, languages: moveById(prev.languages || [], id, direction) }))
                    }
                    onAdd={() => setResume((prev) => ({ ...prev, languages: [...(prev.languages || []), emptyLanguage()] }))}
                    onRemove={(id) =>
                      setResume((prev) => ({ ...prev, languages: (prev.languages || []).filter((row) => row.id !== id) }))
                    }
                    renderItem={(row) => (
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          placeholder="Language"
                          value={row.language}
                          onChange={(e) =>
                            setResume((prev) => ({
                              ...prev,
                              languages: (prev.languages || []).map((item) =>
                                item.id === row.id ? { ...item, language: e.target.value } : item
                              ),
                            }))
                          }
                        />
                        <Input
                          placeholder="Fluency"
                          value={row.fluency || ""}
                          onChange={(e) =>
                            setResume((prev) => ({
                              ...prev,
                              languages: (prev.languages || []).map((item) =>
                                item.id === row.id ? { ...item, fluency: e.target.value } : item
                              ),
                            }))
                          }
                        />
                      </div>
                    )}
                  />

                  <EditorList
                    title="Certificates"
                    addLabel="Add certificate"
                    items={resume.certificates || []}
                    onMove={(id, direction) =>
                      setResume((prev) => ({ ...prev, certificates: moveById(prev.certificates || [], id, direction) }))
                    }
                    onAdd={() =>
                      setResume((prev) => ({ ...prev, certificates: [...(prev.certificates || []), emptyCertificate()] }))
                    }
                    onRemove={(id) =>
                      setResume((prev) => ({ ...prev, certificates: (prev.certificates || []).filter((row) => row.id !== id) }))
                    }
                    renderItem={(row) => (
                      <div className="grid gap-3">
                        <Input
                          placeholder="Certificate"
                          value={row.name}
                          onChange={(e) =>
                            setResume((prev) => ({
                              ...prev,
                              certificates: (prev.certificates || []).map((item) =>
                                item.id === row.id ? { ...item, name: e.target.value } : item
                              ),
                            }))
                          }
                        />
                        <div className="grid grid-cols-2 gap-3">
                          <Input
                            placeholder="Issuer"
                            value={row.issuer || ""}
                            onChange={(e) =>
                              setResume((prev) => ({
                                ...prev,
                                certificates: (prev.certificates || []).map((item) =>
                                  item.id === row.id ? { ...item, issuer: e.target.value } : item
                                ),
                              }))
                            }
                          />
                          <Input
                            placeholder="Year"
                            value={row.date || ""}
                            onChange={(e) =>
                              setResume((prev) => ({
                                ...prev,
                                certificates: (prev.certificates || []).map((item) =>
                                  item.id === row.id ? { ...item, date: e.target.value } : item
                                ),
                              }))
                            }
                          />
                        </div>
                      </div>
                    )}
                  />

                  <EditorList
                    title="Awards"
                    addLabel="Add award"
                    items={resume.awards || []}
                    onMove={(id, direction) => setResume((prev) => ({ ...prev, awards: moveById(prev.awards || [], id, direction) }))}
                    onAdd={() => setResume((prev) => ({ ...prev, awards: [...(prev.awards || []), emptyAward()] }))}
                    onRemove={(id) => setResume((prev) => ({ ...prev, awards: (prev.awards || []).filter((row) => row.id !== id) }))}
                    renderItem={(row) => (
                      <div className="grid gap-3">
                        <Input
                          placeholder="Award"
                          value={row.title}
                          onChange={(e) =>
                            setResume((prev) => ({
                              ...prev,
                              awards: (prev.awards || []).map((item) => (item.id === row.id ? { ...item, title: e.target.value } : item)),
                            }))
                          }
                        />
                        <Input
                          placeholder="Year"
                          value={row.date || ""}
                          onChange={(e) =>
                            setResume((prev) => ({
                              ...prev,
                              awards: (prev.awards || []).map((item) => (item.id === row.id ? { ...item, date: e.target.value } : item)),
                            }))
                          }
                        />
                        <RichTextEditor
                          key={`${row.id}-summary`}
                          value={row.summary || ""}
                          onChange={(html) =>
                            setResume((prev) => ({
                              ...prev,
                              awards: (prev.awards || []).map((item) =>
                                item.id === row.id ? { ...item, summary: html } : item
                              ),
                            }))
                          }
                          placeholder="What it was for"
                          minHeight={80}
                        />
                      </div>
                    )}
                  />
                </div>
                <div className="min-w-0 xl:sticky xl:top-24">
                  <ResumePreview resume={resume} />
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-border px-6 py-16 text-center xl:col-span-2">
                <p className="text-[17px] font-semibold tracking-[-0.02em]">No resumes yet</p>
                <p className="mx-auto mt-2 max-w-md text-[14px] text-muted-foreground">
                  Start from your profile or open a blank page.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  <Button type="button" className="rounded-full" onClick={() => addResume(true)}>
                    New from profile
                  </Button>
                  <Button type="button" variant="outline" className="rounded-full" onClick={() => addResume(false)}>
                    Blank resume
                  </Button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="letter" className="mt-5">
          <div className="grid items-start gap-6 xl:grid-cols-[220px_minmax(0,26rem)_minmax(0,1fr)]">
            <aside className="space-y-2 xl:sticky xl:top-24">
              <p className="px-1 text-[13px] font-semibold tracking-[-0.02em]">Your letters</p>
              <div className="flex gap-2 overflow-x-auto pb-1 xl:flex-col xl:overflow-visible">
                {letters.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveLetterId(item.id)}
                    className={cn(
                      "min-w-[180px] rounded-2xl border px-3 py-3 text-left transition-colors xl:min-w-0",
                      item.id === letter?.id
                        ? "border-primary bg-secondary"
                        : "border-border bg-card hover:border-primary/40"
                    )}
                  >
                    <p className="truncate text-[14px] font-semibold tracking-[-0.02em]">{item.title || "Untitled"}</p>
                    <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                      {[item.company, item.role].filter(Boolean).join(" · ") || relativeTime(item.updatedAt)}
                    </p>
                  </button>
                ))}
              </div>
              <Button type="button" variant="ghost" size="sm" className="w-full justify-start rounded-xl" onClick={() => addLetter(false)}>
                <Plus className="h-4 w-4" />
                New letter
              </Button>
            </aside>

            {letter ? (
              <>
                <div className="space-y-4">
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
                  <div className="flex flex-wrap gap-2">
                    {(["standard", "short", "campus"] as LetterTone[]).map((tone) => (
                      <Button
                        key={tone}
                        type="button"
                        size="sm"
                        variant={letterTone === tone ? "secondary" : "outline"}
                        className="rounded-full"
                        onClick={() => setLetterTone(tone)}
                      >
                        {tone === "standard" ? "Standard" : tone === "short" ? "Short" : "Campus"}
                      </Button>
                    ))}
                  </div>
                  <Field label="Letter">
                    <RichTextEditor
                      key={letter.id}
                      value={letter.body}
                      onChange={(html) => updateLetter({ body: html })}
                      placeholder="Write the letter, or generate a draft below."
                      minHeight={280}
                    />
                  </Field>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-full"
                      onClick={() =>
                        updateLetter({
                          body: draftCoverLetter({
                            resume,
                            company: letter.company,
                            role: letter.role,
                            tone: letterTone,
                          }),
                        })
                      }
                    >
                      <Sparkles className="h-4 w-4" />
                      Rewrite from profile
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="rounded-full text-destructive"
                      onClick={() => setPendingDelete({ kind: "letter", id: letter.id })}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete letter
                    </Button>
                  </div>
                </div>
                <div className="min-w-0 xl:sticky xl:top-24">
                  <CoverLetterPreview
                    body={letter.body || ""}
                    name={resume.basics.name}
                    role={letter.role}
                    company={letter.company}
                  />
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-border px-6 py-16 text-center xl:col-span-2">
                <p className="text-[17px] font-semibold tracking-[-0.02em]">No cover letters yet</p>
                <p className="mx-auto mt-2 max-w-md text-[14px] text-muted-foreground">
                  Generate a first draft from your resume, then tailor it to the company.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  <Button type="button" className="rounded-full" onClick={() => addLetter(true)}>
                    Draft from profile
                  </Button>
                  <Button type="button" variant="outline" className="rounded-full" onClick={() => addLetter(false)}>
                    Blank letter
                  </Button>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {pendingDelete?.kind === "letter" ? "cover letter" : "resume"}?</DialogTitle>
            <DialogDescription>
              {pendingTitle} will be removed
              {pendingDelete?.kind === "resume" && documents.find((doc) => doc.id === pendingDelete.id)?.isProfile
                ? ", including the CV on your profile."
                : "."}{" "}
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-full" onClick={() => setPendingDelete(null)}>
              Keep it
            </Button>
            <Button type="button" variant="destructive" className="rounded-full" onClick={() => void confirmDelete()}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function EditorList<T extends { id: string }>({
  title,
  addLabel,
  items,
  onAdd,
  onRemove,
  onMove,
  renderItem,
}: {
  title: string
  addLabel: string
  items: T[]
  onAdd: () => void
  onRemove: (id: string) => void
  onMove?: (id: string, direction: -1 | 1) => void
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
      {items.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">Nothing here yet.</p>
      ) : null}
      {items.map((item, index) => (
        <div key={item.id} className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <div className="flex justify-end gap-1">
            {onMove ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label="Move up"
                  disabled={index === 0}
                  onClick={() => onMove(item.id, -1)}
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label="Move down"
                  disabled={index === items.length - 1}
                  onClick={() => onMove(item.id, 1)}
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </>
            ) : null}
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
