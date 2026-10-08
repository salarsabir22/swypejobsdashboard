"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/lib/hooks/use-toast"
import { notifyApplicationMilestone } from "@/lib/engagement"
import type { ScreeningQuestion } from "@/lib/jobs/screening"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { isUniqueViolation } from "@/lib/swipe/errors"
import { COVER_LETTER_QUESTION_ID } from "@/lib/resume/cover-letter"
import type { CoverLetter } from "@/lib/resume/schema"

const MAX_VIDEO_SECONDS = 90
const MAX_VIDEO_MB = 40

export function JobApplyForm({
  userId,
  jobId,
  jobTitle,
  recruiterId,
  companyName,
  questions,
  savedLetters = [],
}: {
  userId: string
  jobId: string
  jobTitle: string
  recruiterId: string
  companyName: string
  questions: ScreeningQuestion[]
  savedLetters?: CoverLetter[]
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [files, setFiles] = useState<Record<string, File | null>>({})
  const [coverLetter, setCoverLetter] = useState(savedLetters[0]?.body || "")
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    for (const q of questions) {
      if (!q.required) continue
      if (q.type === "text" && !answers[q.id]?.trim()) {
        toast({ variant: "destructive", title: "Answer required", description: q.prompt })
        return
      }
      if (q.type === "video" && !files[q.id]) {
        toast({ variant: "destructive", title: "Video required", description: q.prompt })
        return
      }
    }

    setBusy(true)
    const supabase = createClient()

    for (const q of questions) {
      let mediaUrl: string | null = null
      const text = answers[q.id]?.trim() || null
      const file = files[q.id]
      if (q.type === "video" && file) {
        if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
          toast({ variant: "destructive", title: "Video too large", description: `Max ${MAX_VIDEO_MB}MB.` })
          setBusy(false)
          return
        }
        const duration = await videoDuration(file)
        if (duration > MAX_VIDEO_SECONDS + 1) {
          toast({
            variant: "destructive",
            title: "Video is too long",
            description: `Keep it to ${MAX_VIDEO_SECONDS} seconds.`,
          })
          setBusy(false)
          return
        }
        const ext = file.name.split(".").pop()?.toLowerCase() || "webm"
        const path = `${userId}/${jobId}/${q.id}.${ext}`
        let bucket = "application-media"
        let storedPath = path
        let uploaded = await supabase.storage.from(bucket).upload(storedPath, file, { upsert: true })
        if (uploaded.error) {
          bucket = "profile-videos"
          storedPath = `applications/${path}`
          uploaded = await supabase.storage.from(bucket).upload(storedPath, file, { upsert: true })
        }
        if (uploaded.error) {
          toast({ variant: "destructive", title: "Could not upload video", description: uploaded.error.message })
          setBusy(false)
          return
        }
        const { data: pub } = supabase.storage.from(bucket).getPublicUrl(storedPath)
        mediaUrl = pub.publicUrl
      }

      if (!text && !mediaUrl) continue
      const { error } = await supabase.from("job_application_answers").upsert(
        {
          job_id: jobId,
          student_id: userId,
          question_id: q.id,
          answer_text: text,
          media_url: mediaUrl,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "job_id,student_id,question_id" }
      )
      if (error) {
        toast({ variant: "destructive", title: "Could not save answers", description: error.message })
        setBusy(false)
        return
      }
    }

    if (coverLetter.trim()) {
      const letterSave = await supabase.from("job_application_answers").upsert(
        {
          job_id: jobId,
          student_id: userId,
          question_id: COVER_LETTER_QUESTION_ID,
          answer_text: coverLetter.trim(),
          media_url: null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "job_id,student_id,question_id" }
      )
      if (letterSave.error) {
        toast({ variant: "destructive", title: "Could not save cover letter", description: letterSave.error.message })
        setBusy(false)
        return
      }
    }

    await supabase.from("job_swipes").delete().eq("student_id", userId).eq("job_id", jobId).eq("direction", "saved")
    const { error } = await supabase.from("job_swipes").insert({ student_id: userId, job_id: jobId, direction: "right" })
    if (error && !isUniqueViolation(error)) {
      toast({ variant: "destructive", title: "Could not apply", description: error.message })
      setBusy(false)
      return
    }

    void notifyApplicationMilestone(supabase, { jobId, recruiterId, jobTitle })
    toast({ title: "Applied", description: jobTitle })
    router.push("/matches")
    router.refresh()
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label>Cover letter (optional)</Label>
          <Link
            href={`/resume?tab=letter&role=${encodeURIComponent(jobTitle)}&company=${encodeURIComponent(companyName)}`}
            className="text-[12px] font-medium text-primary hover:underline"
          >
            Open builder
          </Link>
        </div>
        {savedLetters.length > 1 ? (
          <select
            className="h-11 w-full rounded-full border border-input bg-white px-4 text-sm"
            defaultValue={savedLetters[0]?.id}
            onChange={(e) => {
              const next = savedLetters.find((item) => item.id === e.target.value)
              if (next) setCoverLetter(next.body)
            }}
          >
            {savedLetters.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        ) : null}
        <Textarea
          rows={6}
          value={coverLetter}
          onChange={(e) => setCoverLetter(e.target.value)}
          placeholder={`A short note to ${companyName || "the hiring team"} for ${jobTitle}.`}
        />
      </div>
      {questions.map((q) => (
        <div key={q.id} className="space-y-2">
          <Label>
            {q.prompt}
            {q.required ? <span className="ml-1 font-normal text-muted-foreground">(required)</span> : null}
          </Label>
          {q.type === "video" ? (
            <div className="space-y-2">
              <input
                type="file"
                accept="video/*"
                className="block w-full text-[13px]"
                onChange={(e) => setFiles((prev) => ({ ...prev, [q.id]: e.target.files?.[0] ?? null }))}
              />
              <p className="text-[12px] text-muted-foreground">Up to 90 seconds. MP4 or WebM.</p>
              {files[q.id] ? <p className="text-[13px] text-foreground">{files[q.id]?.name}</p> : null}
            </div>
          ) : (
            <Textarea
              rows={5}
              value={answers[q.id] ?? ""}
              onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
              placeholder="Write your answer"
            />
          )}
        </div>
      ))}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={busy} className="h-12 px-6">
          {busy ? "Submitting…" : "Submit application"}
        </Button>
        <Button type="button" variant="ghost" asChild>
          <Link href={`/jobs/${jobId}`}>Back to role</Link>
        </Button>
      </div>
    </form>
  )
}

function videoDuration(file: File) {
  return new Promise<number>((resolve) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement("video")
    video.preload = "metadata"
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url)
      resolve(Number.isFinite(video.duration) ? video.duration : 0)
    }
    video.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(0)
    }
    video.src = url
  })
}
