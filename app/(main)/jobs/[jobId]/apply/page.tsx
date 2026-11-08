import dynamic from "next/dynamic"
import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { parseCoverLetters, parseResumeLibrary } from "@/lib/resume/schema"
import { parseScreeningQuestions } from "@/lib/jobs/screening"
import { studentEligibility } from "@/lib/jobs/targeting"
import { deadlinePassed, formatDeadline } from "@/lib/jobs/deadline"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

const JobApplyForm = dynamic(() => import("@/components/jobs/JobApplyForm").then((m) => m.JobApplyForm), {
  loading: () => <p className="text-sm text-muted-foreground" role="status">Loading application form…</p>,
})

export default async function JobApplyPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/jobs/${jobId}/apply`)

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
  if (profile?.role !== "student") redirect(`/jobs/${jobId}`)

  const { data: job } = await supabase
    .from("jobs")
    .select("*, recruiter_profiles(company_name, is_approved)")
    .eq("id", jobId)
    .maybeSingle()
  if (!job) notFound()

  const company = Array.isArray(job.recruiter_profiles) ? job.recruiter_profiles[0] : job.recruiter_profiles
  if (!job.is_active || company?.is_approved !== true) notFound()

  const deadline = (job as { application_deadline?: string | null }).application_deadline
  if (deadlinePassed(deadline)) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <h1 className="text-[clamp(1.8rem,3vw,2.4rem)] font-semibold tracking-[-0.04em]">Applications have closed</h1>
        <p className="text-[15px] text-muted-foreground">
          {company?.company_name || "The employer"} stopped accepting applications for {job.title} on{" "}
          {formatDeadline(deadline)}.
        </p>
        <Button asChild>
          <Link href="/discover">Discover more roles</Link>
        </Button>
      </div>
    )
  }

  const studentQuery = await supabase
    .from("student_profiles")
    .select("still_enrolled, current_semester, degree, graduation_year, cgpa, is_alumni, gender, department, preferred_locations, cover_letters, resume_document")
    .eq("id", user.id)
    .maybeSingle()
  const student = studentQuery.error
    ? (
        await supabase
          .from("student_profiles")
          .select("still_enrolled, current_semester, degree, graduation_year")
          .eq("id", user.id)
          .maybeSingle()
      ).data
    : studentQuery.data

  const eligibility = studentEligibility(job, student)
  if (!eligibility.eligible) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <h1 className="text-[clamp(1.8rem,3vw,2.4rem)] font-semibold tracking-[-0.04em]">This role isn’t open to your profile</h1>
        <p className="text-[15px] text-muted-foreground">The employer limited who can apply:</p>
        <ul className="list-disc space-y-1 pl-5 text-[15px] text-muted-foreground">
          {eligibility.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
        <p className="text-[15px] text-muted-foreground">Update your education on your profile if any of this has changed.</p>
        <Button asChild>
          <Link href="/onboarding">Update education</Link>
        </Button>
      </div>
    )
  }

  const { data: existing } = await supabase
    .from("job_swipes")
    .select("direction")
    .eq("student_id", user.id)
    .eq("job_id", jobId)
    .maybeSingle()
  if (existing?.direction === "right") redirect("/matches")

  const questions = parseScreeningQuestions(job.screening_questions)

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div>
        <p className="text-[14px] text-muted-foreground">{company?.company_name}</p>
        <h1 className="mt-1 text-[clamp(1.8rem,3vw,2.4rem)] font-semibold tracking-[-0.04em]">{job.title}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          {questions.length
            ? "Answer these before your application is sent. Mandatory questions are marked."
            : "Confirm to send your profile to this team."}
        </p>
      </div>
      <Card>
        <CardContent className="p-5 sm:p-6">
          <JobApplyForm
            userId={user.id}
            jobId={job.id}
            jobTitle={job.title}
            recruiterId={job.recruiter_id}
            companyName={company?.company_name || ""}
            questions={questions}
            savedLetters={parseCoverLetters((student as { cover_letters?: unknown } | null)?.cover_letters)}
            savedResumes={parseResumeLibrary((student as { resume_document?: unknown } | null)?.resume_document)}
          />
        </CardContent>
      </Card>
    </div>
  )
}
