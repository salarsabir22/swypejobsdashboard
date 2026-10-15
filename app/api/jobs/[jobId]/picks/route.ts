import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { COVER_LETTER_QUESTION_ID } from "@/lib/resume/cover-letter"
import { parseScreeningQuestions } from "@/lib/jobs/screening"
import { aiRankConfig, rankApplicantsWithAi } from "@/lib/match/ai-rank"
import {
  rankApplicantsLocally,
  resumePlainText,
  topPicks,
  type ApplicantBrief,
  type JobBrief,
} from "@/lib/match/applicant-picks"

export const maxDuration = 60

function asText(value: unknown) {
  return typeof value === "string" ? value : ""
}

function asList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
}

export async function GET(_request: Request, context: { params: Promise<{ jobId: string }> }) {
  try {
    const { jobId } = await context.params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    if (profile?.role !== "recruiter") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

    const { data: job } = await supabase
      .from("jobs")
      .select("id, recruiter_id, title, description, category, required_skills, nice_to_have_skills, screening_questions")
      .eq("id", jobId)
      .maybeSingle()
    if (!job || job.recruiter_id !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const { data: applications } = await supabase
      .from("job_swipes")
      .select("student_id")
      .eq("job_id", jobId)
      .eq("direction", "right")

    const studentIds = [...new Set((applications || []).map((row) => row.student_id as string).filter(Boolean))]
    if (studentIds.length === 0) return NextResponse.json({ source: "profile", picks: [] })

    const [{ data: profiles }, studentResult, { data: answers }] = await Promise.all([
      supabase.from("profiles").select("id, full_name, bio").in("id", studentIds),
      supabase
        .from("student_profiles")
        .select("id, university, degree, graduation_year, skills, interests, preferred_job_categories, resume_document")
        .in("id", studentIds),
      supabase.from("job_application_answers").select("student_id, question_id, answer_text").eq("job_id", jobId).in("student_id", studentIds),
    ])

    const students = studentResult.error
      ? (
          await supabase
            .from("student_profiles")
            .select("id, university, degree, graduation_year, skills")
            .in("id", studentIds)
        ).data
      : studentResult.data

    const prompts = new Map(parseScreeningQuestions(job.screening_questions).map((question) => [question.id, question.prompt]))
    const profileMap = new Map((profiles || []).map((row) => [row.id as string, row]))
    const studentMap = new Map((students || []).map((row) => [row.id as string, row]))
    const answerMap = new Map<string, string[]>()
    for (const row of answers || []) {
      const text = asText(row.answer_text).trim()
      if (!text) continue
      const studentId = row.student_id as string
      const questionId = row.question_id as string
      const label = questionId === COVER_LETTER_QUESTION_ID ? "Cover letter" : prompts.get(questionId) || "Answer"
      const bucket = answerMap.get(studentId) || []
      bucket.push(`${label}: ${text.slice(0, 400)}`)
      answerMap.set(studentId, bucket)
    }

    const applicants: ApplicantBrief[] = studentIds.map((id) => {
      const person = profileMap.get(id)
      const student = studentMap.get(id) as Record<string, unknown> | undefined
      const interests = asList(student?.interests)
      const categories = asList(student?.preferred_job_categories)
      const skills = [...asList(student?.skills), ...interests]
      const resume = [resumePlainText(student?.resume_document), categories.length ? `Interested in ${categories.join(", ")}` : ""]
        .filter(Boolean)
        .join(" ")
      return {
        id,
        name: asText(person?.full_name) || "Candidate",
        university: asText(student?.university) || null,
        degree: asText(student?.degree) || null,
        graduationYear: typeof student?.graduation_year === "number" ? student.graduation_year : null,
        skills,
        bio: asText(person?.bio),
        resume,
        answers: (answerMap.get(id) || []).join("\n"),
      }
    })

    const jobBrief: JobBrief = {
      title: asText(job.title) || "Role",
      description: asText(job.description),
      requiredSkills: asList(job.required_skills),
      niceSkills: asList(job.nice_to_have_skills),
      category: asText(job.category) || null,
    }
    const local = rankApplicantsLocally(jobBrief, applicants)
    const poolIds = new Set(local.slice(0, 24).map((row) => row.studentId))
    const pool = applicants.filter((person) => poolIds.has(person.id))
    const config = aiRankConfig()
    const ai = await rankApplicantsWithAi(jobBrief, pool.length ? pool : applicants)
    const ranked = topPicks(ai, local, 10)
    const provider = !ai || !config ? null : config.base.includes("groq.com") ? "groq" : config.base.includes("x.ai") ? "grok" : "ai"
    return NextResponse.json({ ...ranked, model: ai && config ? config.model : null, provider })
  } catch (error) {
    console.error("[api/jobs/picks]", error instanceof Error ? error.message : "unknown")
    return NextResponse.json({ error: "Could not rank applicants" }, { status: 500 })
  }
}
