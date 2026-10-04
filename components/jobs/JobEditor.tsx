"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/lib/hooks/use-toast"
import { ArrowLeft, Loader2, X } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { JOB_CATEGORIES } from "@/lib/company-options"
import { notifyNewJobsInCategory } from "@/lib/engagement"
import type { Job } from "@/types"

const SKILL_SUGGESTIONS = [
  "JavaScript",
  "TypeScript",
  "React",
  "Python",
  "Node.js",
  "SQL",
  "Java",
  "AWS",
  "Docker",
  "Git",
  "Machine Learning",
  "Figma",
]

export function JobEditor({ job }: { job?: Job }) {
  const editing = Boolean(job)
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState(job?.title ?? "")
  const [description, setDescription] = useState(job?.description ?? "")
  const [jobType, setJobType] = useState(job?.job_type ?? "")
  const [location, setLocation] = useState(job?.location ?? "")
  const [isRemote, setIsRemote] = useState(Boolean(job?.is_remote))
  const [requiredSkills, setRequiredSkills] = useState<string[]>(job?.required_skills ?? [])
  const [niceToHaveSkills, setNiceToHaveSkills] = useState<string[]>(job?.nice_to_have_skills ?? [])
  const [category, setCategory] = useState(job?.category ?? "")
  const [reqSkillInput, setReqSkillInput] = useState("")
  const [nthSkillInput, setNthSkillInput] = useState("")
  const [salaryMin, setSalaryMin] = useState(job?.salary_min ? String(job.salary_min) : "")
  const [salaryMax, setSalaryMax] = useState(job?.salary_max ? String(job.salary_max) : "")
  const [salaryNote, setSalaryNote] = useState(job?.compensation_note ?? "")

  const addSkill = (skill: string, list: string[], setList: (v: string[]) => void, clear: () => void) => {
    const s = skill.trim()
    if (s && !list.includes(s)) setList([...list, s])
    clear()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !jobType) {
      toast({ variant: "destructive", title: "Missing fields", description: "Title and job type are required." })
      return
    }
    setLoading(true)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const payload: Record<string, unknown> = {
      title,
      description: description || null,
      job_type: jobType,
      location: location || null,
      is_remote: isRemote,
      required_skills: requiredSkills,
      nice_to_have_skills: niceToHaveSkills,
    }
    if (!editing) payload.recruiter_id = user!.id
    if (category) payload.category = category
    const min = salaryMin ? Number(salaryMin) : null
    const max = salaryMax ? Number(salaryMax) : null
    if (min) payload.salary_min = min
    else if (editing) payload.salary_min = null
    if (max) payload.salary_max = max
    else if (editing) payload.salary_max = null
    payload.compensation_note = salaryNote.trim() || null
    payload.salary_currency = "PKR"

    const query = editing
      ? supabase.from("jobs").update(payload).eq("id", job!.id)
      : supabase.from("jobs").insert(payload)
    const { error } = await query
    if (error && (category || min || max || salaryNote.trim())) {
      delete payload.category
      delete payload.salary_min
      delete payload.salary_max
      delete payload.compensation_note
      delete payload.salary_currency
      const retry = editing
        ? await supabase.from("jobs").update(payload).eq("id", job!.id)
        : await supabase.from("jobs").insert(payload)
      if (retry.error) {
        toast({
          variant: "destructive",
          title: editing ? "Failed to save job" : "Failed to post job",
          description: retry.error.message,
        })
        setLoading(false)
        return
      }
    } else if (error) {
      toast({
        variant: "destructive",
        title: editing ? "Failed to save job" : "Failed to post job",
        description: error.message,
      })
      setLoading(false)
      return
    }
    if (!editing && category) {
      void notifyNewJobsInCategory(supabase, { category })
    }
    toast({
      title: editing ? "Job updated" : "Job posted",
      description: editing ? "Students will see the new details." : "It's live. Applications will show up in Pipeline.",
    })
    router.push(editing ? `/jobs/${job!.id}` : "/jobs")
    router.refresh()
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-full" asChild>
          <Link href={editing ? `/jobs/${job!.id}` : "/jobs"} aria-label="Back">
            <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
          </Link>
        </Button>
        <div className="min-w-0">
          <p className="font-data text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {editing ? "Edit listing" : "New listing"}
          </p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]">
            {editing ? "Update job" : "Post a job"}
          </h1>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="font-heading text-lg">Role details</CardTitle>
          <CardDescription>
            {editing
              ? "Changes apply to Discover immediately."
              : "Students see this in Discover once your account is approved."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="job-title">
                Title <span className="font-normal text-muted-foreground">(required)</span>
              </Label>
              <Input
                id="job-title"
                className="h-11 rounded-xl"
                placeholder="e.g. Frontend engineer intern"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="job-type">
                Type <span className="font-normal text-muted-foreground">(required)</span>
              </Label>
              <Select value={jobType || undefined} onValueChange={setJobType}>
                <SelectTrigger id="job-type" className="h-11 rounded-xl">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="internship">Internship</SelectItem>
                  <SelectItem value="full_time">Full-time</SelectItem>
                  <SelectItem value="part_time">Part-time</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="job-category">Category</Label>
              <Select value={category || undefined} onValueChange={setCategory}>
                <SelectTrigger id="job-category" className="h-11 rounded-xl">
                  <SelectValue placeholder="e.g. Sales, Engineering" />
                </SelectTrigger>
                <SelectContent>
                  {JOB_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="job-desc">Description</Label>
              <Textarea
                id="job-desc"
                className="min-h-[120px] rounded-xl"
                placeholder="What will they do, learn, and ship?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1 space-y-2">
                <Label htmlFor="job-location">Location</Label>
                <Input
                  id="job-location"
                  className="h-11 rounded-xl"
                  placeholder="e.g. Karachi, Lahore, or Remote"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  disabled={isRemote}
                />
              </div>
              <Button
                type="button"
                variant={isRemote ? "default" : "outline"}
                className="h-11 shrink-0 rounded-xl sm:min-w-[7rem]"
                onClick={() => setIsRemote(!isRemote)}
              >
                Remote
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="salary-min">Salary min (PKR)</Label>
                <Input
                  id="salary-min"
                  className="h-11 rounded-xl"
                  inputMode="numeric"
                  placeholder="e.g. 80000"
                  value={salaryMin}
                  onChange={(e) => setSalaryMin(e.target.value.replace(/[^\d]/g, ""))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="salary-max">Salary max (PKR)</Label>
                <Input
                  id="salary-max"
                  className="h-11 rounded-xl"
                  inputMode="numeric"
                  placeholder="e.g. 150000"
                  value={salaryMax}
                  onChange={(e) => setSalaryMax(e.target.value.replace(/[^\d]/g, ""))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="salary-note">Pay note (optional)</Label>
              <Input
                id="salary-note"
                className="h-11 rounded-xl"
                placeholder="e.g. stipend + lunch, equity TBD"
                value={salaryNote}
                onChange={(e) => setSalaryNote(e.target.value)}
              />
            </div>

            <Separator />

            <div className="space-y-3">
              <Label>Required skills</Label>
              <div className="flex gap-2">
                <Input
                  className="h-11 rounded-xl"
                  placeholder="Add a skill"
                  value={reqSkillInput}
                  onChange={(e) => setReqSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      addSkill(reqSkillInput, requiredSkills, setRequiredSkills, () => setReqSkillInput(""))
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="h-11 shrink-0 rounded-xl"
                  onClick={() => addSkill(reqSkillInput, requiredSkills, setRequiredSkills, () => setReqSkillInput(""))}
                >
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {SKILL_SUGGESTIONS.filter((s) => !requiredSkills.includes(s))
                  .slice(0, 6)
                  .map((s) => (
                    <Button
                      key={s}
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addSkill(s, requiredSkills, setRequiredSkills, () => {})}
                      className="rounded-full border-dashed"
                    >
                      + {s}
                    </Button>
                  ))}
              </div>
              <div className="flex flex-wrap gap-2">
                {requiredSkills.map((s) => (
                  <Badge key={s} variant="secondary" className="gap-1.5">
                    {s}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 text-muted-foreground hover:text-foreground"
                      aria-label={`Remove ${s}`}
                      onClick={() => setRequiredSkills(requiredSkills.filter((x) => x !== s))}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label>Nice-to-have skills</Label>
              <div className="flex gap-2">
                <Input
                  className="h-11 rounded-xl"
                  placeholder="Add a skill"
                  value={nthSkillInput}
                  onChange={(e) => setNthSkillInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      addSkill(nthSkillInput, niceToHaveSkills, setNiceToHaveSkills, () => setNthSkillInput(""))
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="h-11 shrink-0 rounded-xl"
                  onClick={() => addSkill(nthSkillInput, niceToHaveSkills, setNiceToHaveSkills, () => setNthSkillInput(""))}
                >
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {niceToHaveSkills.map((s) => (
                  <Badge key={s} variant="outline" className="gap-1.5">
                    {s}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 text-muted-foreground hover:text-foreground"
                      aria-label={`Remove ${s}`}
                      onClick={() => setNiceToHaveSkills(niceToHaveSkills.filter((x) => x !== s))}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>

            <Button type="submit" className="h-12 w-full rounded-xl" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : editing ? "Save changes" : "Publish listing"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
