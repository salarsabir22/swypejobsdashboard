"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { parseScreeningQuestions, type ScreeningQuestion } from "@/lib/jobs/screening"
import { signedStorageUrl } from "@/lib/storage/signed-url"

export function ApplicationAnswersList({
  jobId,
  studentId,
  screeningQuestions,
}: {
  jobId: string
  studentId: string
  screeningQuestions: unknown
}) {
  const questions = parseScreeningQuestions(screeningQuestions)
  const [rows, setRows] = useState<{ q: ScreeningQuestion; text: string | null; video: string | null }[]>([])
  const questionKey = questions.map((q) => q.id).join(",")

  useEffect(() => {
    if (questions.length === 0) return
    const list = parseScreeningQuestions(screeningQuestions)
    const run = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from("job_application_answers")
        .select("question_id, answer_text, media_url")
        .eq("job_id", jobId)
        .eq("student_id", studentId)
      const byId = new Map((data || []).map((row) => [row.question_id as string, row]))
      const next = await Promise.all(
        list.map(async (q) => {
          const row = byId.get(q.id)
          const video = q.type === "video" ? await signedStorageUrl(supabase, "application-media", row?.media_url) : null
          const fallback =
            !video && row?.media_url ? await signedStorageUrl(supabase, "profile-videos", row.media_url) : null
          return { q, text: (row?.answer_text as string | null) ?? null, video: video || fallback }
        })
      )
      setRows(next)
    }
    void run()
  }, [jobId, studentId, questionKey, screeningQuestions])

  if (questions.length === 0 || rows.every((item) => !item.text && !item.video)) return null

  return (
    <div className="mt-3 space-y-3 rounded-2xl bg-secondary/50 p-3">
      <p className="text-[13px] font-semibold">Application answers</p>
      {rows.map(({ q, text, video }) => (
        <div key={q.id} className="space-y-1">
          <p className="text-[12px] font-medium text-muted-foreground">{q.prompt}</p>
          {video ? (
            <video src={video} controls className="max-h-48 w-full rounded-xl bg-black" />
          ) : text ? (
            <p className="text-[13px] leading-relaxed">{text}</p>
          ) : null}
        </div>
      ))}
    </div>
  )
}
