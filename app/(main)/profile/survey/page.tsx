import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { getRequestUser } from "@/lib/nav/app-shell-user"
import { studentIsAlumni } from "@/lib/jobs/targeting"
import { CareerSurveyForm } from "@/components/profile/CareerSurveyForm"
import { Button } from "@/components/ui/button"

export default async function CareerSurveyPage() {
  const { supabase, user } = await getRequestUser()
  if (!user) redirect("/login?next=/profile/survey")

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
  if (profile?.role !== "student") redirect("/profile")

  let studentRes = await supabase
    .from("student_profiles")
    .select("still_enrolled, graduation_year, is_alumni")
    .eq("id", user.id)
    .maybeSingle()
  if (studentRes.error) {
    studentRes = await supabase.from("student_profiles").select("still_enrolled, graduation_year").eq("id", user.id).maybeSingle()
  }
  const student = studentRes.error ? null : studentRes.data
  if (!studentIsAlumni(student)) redirect("/profile")

  const surveyRes = await supabase.from("career_surveys").select("*").eq("student_id", user.id)
  const rows = (surveyRes.error ? [] : surveyRes.data || []) as Record<string, unknown>[]

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-full" asChild>
          <Link href="/profile" aria-label="Back to profile">
            <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-[2.25rem]">Career survey</h1>
          <p className="font-body text-sm text-muted-foreground">
            A short first-destination update for the Career Development Center. Submit once a year; you can edit it later.
          </p>
        </div>
      </div>
      <CareerSurveyForm userId={user.id} initialRows={rows} />
    </div>
  )
}
