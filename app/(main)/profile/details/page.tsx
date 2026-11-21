import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { getRequestUser } from "@/lib/nav/app-shell-user"
import { ProfileDetailsEditor, type ProfileDetails } from "@/components/profile/ProfileDetailsEditor"
import { mergeContact } from "@/lib/profile/contact"
import { Button } from "@/components/ui/button"

/** Edit what onboarding captured: bio, CGPA, skills, links. Separate from the first-run wizard. */
export default async function ProfileDetailsPage() {
  const { supabase, user } = await getRequestUser()
  if (!user) redirect("/login?next=/profile/details")

  const [{ data: profile }, studentRes] = await Promise.all([
    supabase.from("profiles").select("role, bio").eq("id", user.id).maybeSingle(),
    supabase
      .from("student_profiles")
      .select("university, degree, graduation_year, cgpa, skills, preferred_job_categories, linkedin_url, github_url, portfolio_url")
      .eq("id", user.id)
      .maybeSingle(),
  ])
  if (profile?.role !== "student") redirect("/profile")

  const row = studentRes.error ? null : studentRes.data
  const cgpa = row?.cgpa === null || row?.cgpa === undefined ? "" : Number(row.cgpa).toFixed(2)
  const contactRes = await supabase.from("student_profiles").select("phone, personal_email").eq("id", user.id).maybeSingle()
  const contact = mergeContact(
    contactRes.error ? null : (contactRes.data as { phone?: unknown; personal_email?: unknown } | null),
    user.user_metadata as Record<string, unknown> | null
  )

  const initial: ProfileDetails = {
    bio: profile?.bio || "",
    phone: contact.phone,
    personalEmail: contact.personalEmail,
    university: row?.university || "",
    degree: row?.degree || "",
    graduationYear: row?.graduation_year ? String(row.graduation_year) : "",
    cgpa,
    skills: row?.skills || [],
    categories: row?.preferred_job_categories || [],
    linkedin: row?.linkedin_url || "",
    github: row?.github_url || "",
    portfolio: row?.portfolio_url || "",
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="icon" className="h-10 w-10 shrink-0 rounded-full" asChild>
          <Link href="/profile" aria-label="Back to profile">
            <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-foreground sm:text-[2.25rem]">Edit details</h1>
          <p className="font-body text-sm text-muted-foreground">
            Bio, phone, personal email, CGPA, skills, and links. Changes show on your profile and in Discover immediately.
          </p>
        </div>
      </div>
      <ProfileDetailsEditor userId={user.id} initial={initial} />
    </div>
  )
}
