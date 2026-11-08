import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { getRequestUser } from "@/lib/nav/app-shell-user"
import { parseCareerHistory } from "@/lib/profile/career"
import { CareerHistoryEditor } from "@/components/profile/CareerHistoryEditor"
import { Button } from "@/components/ui/button"

export default async function ProfileExperiencePage() {
  const { supabase, user } = await getRequestUser()
  if (!user) redirect("/login?next=/profile/experience")

  const [{ data: profile }, studentRes] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    supabase.from("student_profiles").select("work_history, projects, certifications").eq("id", user.id).maybeSingle(),
  ])
  if (profile?.role !== "student") redirect("/profile")

  // Column may not exist until the migration runs; the editor still renders and reports on save.
  const history = parseCareerHistory(studentRes.error ? null : studentRes.data)

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-full" asChild>
          <Link href="/profile" aria-label="Back to profile">
            <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-[2.25rem]">Experience</h1>
          <p className="font-body text-sm text-muted-foreground">
            Internships, jobs, projects, and certifications. Update any time; alumni can keep their employment history current here.
          </p>
        </div>
      </div>
      <CareerHistoryEditor userId={user.id} initial={history} />
    </div>
  )
}
