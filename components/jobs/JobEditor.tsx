"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/lib/hooks/use-toast"
import { ArrowLeft, X } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { DatePicker } from "@/components/ui/date-picker"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { JOB_CATEGORIES } from "@/lib/company-options"
import { notifyNewJobsInCategory } from "@/lib/engagement"
import { parseRequiredSemesters, parseScreeningQuestions, type ScreeningQuestion } from "@/lib/jobs/screening"
import { parseDeadline, todayIso } from "@/lib/jobs/deadline"
import { parseCgpa, parseJobTargeting } from "@/lib/jobs/targeting"
import { ScreeningQuestionsEditor } from "@/components/jobs/ScreeningQuestionsEditor"
import { JobTargetingEditor, type JobTargetingValue } from "@/components/jobs/JobTargetingEditor"
import { UniversityPicker } from "@/components/profile/UniversityPicker"
import { sameCampus } from "@/lib/jobs/curation"
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
  const [isInternational, setIsInternational] = useState(Boolean(job?.is_international))
  const [requiredSkills, setRequiredSkills] = useState<string[]>(job?.required_skills ?? [])
  const [niceToHaveSkills, setNiceToHaveSkills] = useState<string[]>(job?.nice_to_have_skills ?? [])
  const [category, setCategory] = useState(job?.category ?? "")
  const [reqSkillInput, setReqSkillInput] = useState("")
  const [nthSkillInput, setNthSkillInput] = useState("")
  const [salaryMin, setSalaryMin] = useState(job?.salary_min ? String(job.salary_min) : "")
  const [salaryMax, setSalaryMax] = useState(job?.salary_max ? String(job.salary_max) : "")
  const [salaryNote, setSalaryNote] = useState(job?.compensation_note ?? "")
  const [questions, setQuestions] = useState<ScreeningQuestion[]>(() => parseScreeningQuestions(job?.screening_questions))
  const [requiredSemesters, setRequiredSemesters] = useState<number[]>(() => parseRequiredSemesters(job?.required_semesters))
  const [deadline, setDeadline] = useState(() => parseDeadline(job?.application_deadline) ?? "")
  const [targeting, setTargeting] = useState<JobTargetingValue>(() => {
    const t = parseJobTargeting(job)
    return {
      degreePrograms: t.degreePrograms,
      graduationYears: t.graduationYears,
      minCgpa: t.minCgpa === null ? "" : t.minCgpa.toFixed(2),
      experienceLevel: t.experienceLevel,
      alumniOnly: t.alumniOnly,
      genders: t.genders,
      departments: t.departments,
      locationPreferences: t.locationPreferences,
    }
  })
  const [distributionScope, setDistributionScope] = useState<"network" | "partner_universities">(
    job?.distribution_scope === "partner_universities" ? "partner_universities" : "network"
  )
  const [targetUniversities, setTargetUniversities] = useState<string[]>(job?.target_universities ?? [])
  const [campusPick, setCampusPick] = useState("")

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
    if (deadline && deadline < todayIso()) {
      toast({ variant: "destructive", title: "Deadline is in the past", description: "Pick today or a later date, or clear it." })
      return
    }
    const minCgpa = targeting.minCgpa.trim() ? parseCgpa(targeting.minCgpa) : null
    if (targeting.minCgpa.trim() && minCgpa === null) {
      toast({ variant: "destructive", title: "Invalid CGPA", description: "Enter a number between 0.00 and 4.00." })
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
      is_international: isInternational,
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
    payload.screening_questions = questions.filter((q) => q.prompt.trim())
    payload.required_semesters = requiredSemesters
    payload.application_deadline = deadline || null
    payload.degree_programs = targeting.degreePrograms
    payload.graduation_years = targeting.graduationYears
    payload.min_cgpa = minCgpa
    payload.experience_level = targeting.experienceLevel
    payload.alumni_only = targeting.alumniOnly
    payload.target_genders = targeting.genders
    payload.departments = targeting.departments
    payload.location_preferences = targeting.locationPreferences
    payload.distribution_scope = distributionScope
    let allowedTargets = distributionScope === "partner_universities" ? [...targetUniversities] : []
    if (distributionScope === "partner_universities" && allowedTargets.length) {
      const { data: partners } = await supabase
        .from("campus_employer_partners")
        .select("university, status")
        .eq("recruiter_id", user!.id)
        .eq("status", "active")
      const activeCampuses = (partners || []).map((row) => row.university).filter(Boolean)
      allowedTargets = allowedTargets.filter((name) =>
        activeCampuses.some((campus) => sameCampus(campus, name))
      )
      if (!allowedTargets.length) {
        setLoading(false)
        toast({
          variant: "destructive",
          title: "No active campus partnerships",
          description:
            "Partner-campus listings require an active partnership. You can still post to the SwypeJobs network, or reconnect with a career office first.",
        })
        return
      }
      if (allowedTargets.length < targetUniversities.length) {
        setTargetUniversities(allowedTargets)
        toast({
          title: "Some campuses were removed",
          description: "Only universities with an active partnership can be targeted.",
        })
      }
    }
    payload.target_universities = allowedTargets
    const hasTargeting =
      targeting.degreePrograms.length > 0 ||
      targeting.graduationYears.length > 0 ||
      minCgpa !== null ||
      targeting.experienceLevel !== "any" ||
      targeting.alumniOnly ||
      targeting.genders.length > 0 ||
      targeting.departments.length > 0 ||
      targeting.locationPreferences.length > 0 ||
      isInternational ||
      distributionScope === "partner_universities" ||
      targetUniversities.length > 0

    const query = editing
      ? supabase.from("jobs").update(payload).eq("id", job!.id)
      : supabase.from("jobs").insert(payload)
    const { error } = await query
    if (
      error &&
      (category || min || max || salaryNote.trim() || questions.length || requiredSemesters.length || deadline || hasTargeting)
    ) {
      delete payload.category
      delete payload.salary_min
      delete payload.salary_max
      delete payload.compensation_note
      delete payload.salary_currency
      delete payload.screening_questions
      delete payload.required_semesters
      delete payload.application_deadline
      delete payload.degree_programs
      delete payload.graduation_years
      delete payload.min_cgpa
      delete payload.experience_level
      delete payload.alumni_only
      delete payload.target_genders
      delete payload.departments
      delete payload.location_preferences
      delete payload.is_international
      delete payload.distribution_scope
      delete payload.target_universities
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
    const pushedId = editing
      ? job!.id
      : (
          await supabase.from("jobs").select("id").eq("recruiter_id", user!.id).order("created_at", { ascending: false }).limit(1).maybeSingle()
        ).data?.id
    if (pushedId) {
      void fetch("/api/jobs/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: pushedId }),
      }).catch(() => undefined)
      if (distributionScope === "partner_universities" && targetUniversities.length) {
        const reviews = targetUniversities.map((university) => ({
          job_id: pushedId,
          university,
          status: "pending",
        }))
        await supabase.from("campus_job_reviews").upsert(reviews, { onConflict: "job_id,university" })
      }
    }
    toast({
      title: editing ? "Job updated" : "Job posted",
      description:
        distributionScope === "partner_universities"
          ? "Campus career offices review partner listings before students see them."
          : editing
            ? "Students will see the new details."
            : "It's live. Applications will show up in Pipeline.",
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
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-[2.25rem]">
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
                  <SelectItem value="fellowship">Fellowship</SelectItem>
                  <SelectItem value="freelance">Freelance</SelectItem>
                  <SelectItem value="project">Project</SelectItem>
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

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
              <div className="min-w-0 flex-1 space-y-2 sm:min-w-[12rem]">
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
              <Button
                type="button"
                variant={isInternational ? "default" : "outline"}
                className="h-11 shrink-0 rounded-xl"
                onClick={() => setIsInternational(!isInternational)}
              >
                International
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

            <div className="space-y-2">
              <Label htmlFor="job-deadline">Application deadline (optional)</Label>
              <div className="flex min-w-0 gap-2">
                <DatePicker
                  id="job-deadline"
                  className="h-11 rounded-xl"
                  min={todayIso()}
                  value={deadline}
                  onChange={setDeadline}
                />
                {deadline ? (
                  <Button type="button" variant="outline" className="h-11 shrink-0 rounded-xl" onClick={() => setDeadline("")}>
                    Clear
                  </Button>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                The listing hides from Discover after this day and students can no longer apply. Leave blank to keep it open.
              </p>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label>Required skills</Label>
              <div className="flex min-w-0 gap-2">
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
              <div className="flex min-w-0 gap-2">
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

            <Separator />

            <div className="space-y-3">
              <Label>Who can see this listing</Label>
              <p className="text-[13px] text-muted-foreground">
                Network-wide listings go to every eligible student. Partner campuses each approve the role before it appears there.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setDistributionScope("network")}
                  className={`rounded-2xl border px-4 py-3 text-left text-sm ${distributionScope === "network" ? "border-primary bg-primary/5" : "border-border"}`}
                >
                  <span className="font-medium">All eligible students</span>
                  <span className="mt-1 block text-[13px] text-muted-foreground">SwypeJobs network, subject to verification.</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDistributionScope("partner_universities")}
                  className={`rounded-2xl border px-4 py-3 text-left text-sm ${distributionScope === "partner_universities" ? "border-primary bg-primary/5" : "border-border"}`}
                >
                  <span className="font-medium">Partner campuses only</span>
                  <span className="mt-1 block text-[13px] text-muted-foreground">
                    Creates an approval task per selected university. Only active campus partnerships are allowed.
                  </span>
                </button>
              </div>
              {distributionScope === "partner_universities" ? (
                <div className="space-y-2">
                  <p className="text-[13px] text-muted-foreground">
                    If a career office ends the partnership, you can still post to the SwypeJobs network and any other active partner campuses.
                  </p>
                  <UniversityPicker
                    value={campusPick}
                    onChange={(value) => {
                      setCampusPick(value)
                      if (value && value !== "Other (type your own)" && !targetUniversities.includes(value)) {
                        setTargetUniversities((prev) => [...prev, value])
                        setCampusPick("")
                      }
                    }}
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {targetUniversities.map((name) => (
                      <Badge key={name} variant="secondary" className="gap-1 font-normal">
                        {name}
                        <button type="button" aria-label={`Remove ${name}`} onClick={() => setTargetUniversities((prev) => prev.filter((x) => x !== name))}>
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <Separator />

            <JobTargetingEditor value={targeting} onChange={setTargeting} />

            <Separator />

            <ScreeningQuestionsEditor
              questions={questions}
              onChange={setQuestions}
              requiredSemesters={requiredSemesters}
              onSemestersChange={setRequiredSemesters}
            />

            <Button
              type="submit"
              className="h-12 w-full rounded-xl"
              loading={loading}
              loadingText={editing ? "Saving…" : "Publishing…"}
            >
              {editing ? "Save changes" : "Publish listing"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
