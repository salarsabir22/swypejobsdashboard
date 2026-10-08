import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ResumeStudio } from "@/components/resume/ResumeStudio"
import { parseCoverLetters, parseResumeLibrary } from "@/lib/resume/schema"
import type { ResumeTargetJob } from "@/lib/resume/insights"

export default async function ResumePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; role?: string; company?: string }>
}) {
  const query = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login?next=/resume")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, bio")
    .eq("id", user.id)
    .maybeSingle()
  if (profile?.role !== "student") redirect("/profile")

  const studentQuery = await supabase
    .from("student_profiles")
    .select("university, degree, graduation_year, skills, linkedin_url, github_url, portfolio_url, resume_document, cover_letters")
    .eq("id", user.id)
    .maybeSingle()
  const student = studentQuery.error
    ? (
        await supabase
          .from("student_profiles")
          .select("university, degree, graduation_year, skills, linkedin_url, github_url, portfolio_url")
          .eq("id", user.id)
          .maybeSingle()
      ).data
    : studentQuery.data

  const { data: swipes } = await supabase
    .from("job_swipes")
    .select("job_id")
    .eq("student_id", user.id)
    .in("direction", ["saved", "right"])
    .limit(20)
  const jobIds = [...new Set((swipes || []).map((row) => row.job_id).filter(Boolean))]
  const jobsQuery = jobIds.length
    ? await supabase
        .from("jobs")
        .select("id, title, description, required_skills, recruiter_profiles(company_name)")
        .in("id", jobIds)
        .limit(20)
    : { data: [] as { id: string; title: string; description: string | null; required_skills: string[] | null; recruiter_profiles: { company_name: string } | { company_name: string }[] | null }[] }
  const targetJobs: ResumeTargetJob[] = (jobsQuery.data || []).map((job) => {
    const company = Array.isArray(job.recruiter_profiles) ? job.recruiter_profiles[0] : job.recruiter_profiles
    return {
      id: job.id,
      title: job.title,
      company: company?.company_name || "",
      description: job.description,
      skills: job.required_skills || [],
    }
  })

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-[2.1rem] sm:leading-[1.05]">
            Resume
          </h1>
          <p className="mt-1 max-w-xl text-[14px] leading-relaxed text-muted-foreground">
            Edit versions for different roles. Autosaves to your account. Attach a letter when you apply.
          </p>
        </div>
      </header>
      <ResumeStudio
        userId={user.id}
        seed={{
          fullName: profile.full_name,
          email: user.email,
          bio: profile.bio,
          university: student?.university,
          degree: student?.degree,
          graduationYear: student?.graduation_year,
          skills: student?.skills,
          linkedinUrl: student?.linkedin_url,
          githubUrl: student?.github_url,
          portfolioUrl: student?.portfolio_url,
        }}
        initialDocuments={parseResumeLibrary((student as { resume_document?: unknown } | null)?.resume_document)}
        initialLetters={parseCoverLetters((student as { cover_letters?: unknown } | null)?.cover_letters)}
        initialTab={query.tab === "letter" ? "letter" : "resume"}
        prefillRole={query.role}
        prefillCompany={query.company}
        targetJobs={targetJobs}
      />
    </div>
  )
}
