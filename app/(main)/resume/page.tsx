import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ResumeStudio } from "@/components/resume/ResumeStudio"
import { parseCoverLetters, parseResume } from "@/lib/resume/schema"

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

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <header className="space-y-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-[2.4rem] sm:leading-[1.02]">
          Resume & letters
        </h1>
        <p className="max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
          Build an ATS-friendly CV from your profile, export a PDF, or import a{" "}
          <a href="https://jsonresume.org/schema/" className="font-medium text-primary hover:underline" target="_blank" rel="noreferrer">
            JSON Resume
          </a>
          . Cover letters can be drafted for a specific role and attached when you apply.
        </p>
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
        initialResume={parseResume((student as { resume_document?: unknown } | null)?.resume_document)}
        initialLetters={parseCoverLetters((student as { cover_letters?: unknown } | null)?.cover_letters)}
        initialTab={query.tab === "letter" ? "letter" : "resume"}
        prefillRole={query.role}
        prefillCompany={query.company}
      />
    </div>
  )
}
