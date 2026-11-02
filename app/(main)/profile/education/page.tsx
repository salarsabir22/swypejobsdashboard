import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { getRequestUser } from "@/lib/nav/app-shell-user"
import { parseAcademicHistory } from "@/lib/profile/academics"
import { AcademicHistoryEditor } from "@/components/profile/AcademicHistoryEditor"
import { Button } from "@/components/ui/button"

export default async function EducationHistoryPage() {
  const { supabase, user } = await getRequestUser()
  if (!user) redirect("/login?next=/profile/education")
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
  if (profile?.role !== "student") redirect("/profile")

  const res = await supabase.from("student_profiles").select("academic_history, university, degree, department, graduation_year, cgpa").eq("id", user.id).maybeSingle()
  const row = res.error ? null : res.data
  let records = parseAcademicHistory(row?.academic_history)
  if (!records.length && (row?.university || row?.degree)) {
    records = [{
      id: "primary",
      institution: row?.university || "",
      degree: row?.degree || "",
      department: row?.department || "",
      startYear: "",
      endYear: row?.graduation_year ? String(row.graduation_year) : "",
      cgpa: row?.cgpa ? String(row.cgpa) : "",
      current: true,
    }]
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-full" asChild>
          <Link href="/profile" aria-label="Back to profile">
            <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
          </Link>
        </Button>
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Education</h1>
          <p className="font-body text-sm text-muted-foreground">Add every degree. The one marked current is what employers match against.</p>
        </div>
      </div>
      <AcademicHistoryEditor userId={user.id} initial={records} />
    </div>
  )
}
