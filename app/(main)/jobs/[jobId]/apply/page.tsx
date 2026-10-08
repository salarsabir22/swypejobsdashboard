import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { JobApplyForm } from "@/components/jobs/JobApplyForm"
import { parseScreeningQuestions, studentEligibleForJob } from "@/lib/jobs/screening"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

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
    .select("id, title, recruiter_id, is_active, screening_questions, required_semesters, recruiter_profiles(company_name, is_approved)")
    .eq("id", jobId)
    .maybeSingle()
  if (!job) notFound()

  const company = Array.isArray(job.recruiter_profiles) ? job.recruiter_profiles[0] : job.recruiter_profiles
  if (!job.is_active || company?.is_approved !== true) notFound()

  const { data: student } = await supabase
    .from("student_profiles")
    .select("still_enrolled, current_semester")
    .eq("id", user.id)
    .maybeSingle()

  if (
    !studentEligibleForJob({
      requiredSemesters: job.required_semesters,
      stillEnrolled: student?.still_enrolled,
      currentSemester: student?.current_semester,
    })
  ) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <h1 className="text-[clamp(1.8rem,3vw,2.4rem)] font-semibold tracking-[-0.04em]">This role isn’t open to your semester</h1>
        <p className="text-[15px] text-muted-foreground">
          The employer asked for candidates in specific semesters. Update your education on your profile if that’s changed.
        </p>
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
            questions={questions}
          />
        </CardContent>
      </Card>
    </div>
  )
}
