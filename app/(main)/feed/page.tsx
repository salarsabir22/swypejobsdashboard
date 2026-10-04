import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { FeedPageClient } from "@/components/feed/FeedPageClient"
import { profileSharePath } from "@/lib/share/profile-path"
import { formatFeedHeadline } from "@/lib/feed/headline"
import type { UserRole } from "@/types"

export default async function FeedPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, role, bio")
    .eq("id", user.id)
    .single()

  if (!profile) redirect("/onboarding")

  let headline: string | null = null
  if (profile.role === "recruiter") {
    const { data: company } = await supabase
      .from("recruiter_profiles")
      .select("company_name, industry")
      .eq("id", user.id)
      .maybeSingle()
    headline = formatFeedHeadline([company?.company_name, company?.industry].filter(Boolean).join(" · ")) || "Recruiter"
  } else {
    const { data: student } = await supabase
      .from("student_profiles")
      .select("university, degree")
      .eq("id", user.id)
      .maybeSingle()
    headline = formatFeedHeadline([student?.degree, student?.university].filter(Boolean).join(" · ")) || "Student"
  }

  return (
    <FeedPageClient
      currentUser={{
        id: user.id,
        fullName: profile.full_name || "You",
        avatarUrl: profile.avatar_url,
        role: (profile.role as UserRole) || "student",
        headline,
        bio: profile.bio,
        profilePath: profileSharePath(profile.role, user.id),
      }}
    />
  )
}
