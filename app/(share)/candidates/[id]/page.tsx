import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ShareButton } from "@/components/share/ShareButton"
import { ProfileViewTracker } from "@/components/profile/ProfileViewTracker"
import { ReportBlockMenu } from "@/components/moderation/ReportBlockMenu"
import { ArrowLeft, Calendar, FileText, Github, Globe, GraduationCap, Linkedin, MessageCircle } from "lucide-react"
import { ProfilePosts } from "@/components/feed/ProfilePosts"
import { ProfileHero } from "@/components/profile/ProfileHero"
import { profileSharePath } from "@/lib/share/profile-path"
import { signedStorageUrl } from "@/lib/storage/signed-url"
import type { UserRole } from "@/types"

export default async function CandidatePublicPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ job?: string }>
}) {
  const { id } = await params
  const { job: jobId } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (!profile || profile.role !== "student") notFound()

  const { data: student } = await supabase.from("student_profiles").select("*").eq("id", id).maybeSingle()
  const { data: viewer } = user
    ? await supabase.from("profiles").select("id, role, full_name, avatar_url, bio").eq("id", user.id).maybeSingle()
    : { data: null }
  const isRecruiter = viewer?.role === "recruiter"
  const isOwner = user?.id === id
  const { data: recruiterRow } = isRecruiter && user
    ? await supabase.from("recruiter_profiles").select("is_approved").eq("id", user.id).maybeSingle()
    : { data: null }
  const canSeeResume = isOwner || recruiterRow?.is_approved === true
  const resumeHref = canSeeResume
    ? await signedStorageUrl(supabase, "resumes", student?.resume_url)
    : null

  let chatHref: string | null = null
  if (isRecruiter && user) {
    let matchQuery = supabase
      .from("matches")
      .select("id, conversations(id)")
      .eq("recruiter_id", user.id)
      .eq("student_id", id)
    if (jobId) matchQuery = matchQuery.eq("job_id", jobId)
    const { data: match } = await matchQuery.order("created_at", { ascending: false }).limit(1).maybeSingle()
    const convRaw = match?.conversations as { id?: string } | { id?: string }[] | null | undefined
    const conv = Array.isArray(convRaw) ? convRaw[0] : convRaw
    chatHref = conv?.id ? `/chat/${conv.id}` : match?.id ? `/chat/${match.id}` : null
  }

  const links = [
    student?.linkedin_url && { href: student.linkedin_url, label: "LinkedIn", icon: Linkedin },
    student?.github_url && { href: student.github_url, label: "GitHub", icon: Github },
    student?.portfolio_url && { href: student.portfolio_url, label: "Portfolio", icon: Globe },
    resumeHref && { href: resumeHref, label: "Resume", icon: FileText },
  ].filter(Boolean) as { href: string; label: string; icon: typeof Linkedin }[]

  const school = [student?.university, student?.degree].filter(Boolean).join(" · ")
  const name = profile.full_name || "Candidate"

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {isRecruiter ? <ProfileViewTracker studentId={id} /> : null}

      {isRecruiter ? (
        <Button asChild variant="ghost" size="sm" className="-ml-2 h-8 rounded-full px-2 text-muted-foreground">
          <Link href="/discover">
            <ArrowLeft className="h-4 w-4" />
            Discover
          </Link>
        </Button>
      ) : null}

      <ProfileHero
        userId={id}
        name={name}
        headline={school || "Student"}
        subline={
          student?.graduation_year ? (
            <p className="flex items-center gap-1.5 font-body text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              Class of {student.graduation_year}
            </p>
          ) : null
        }
        avatarUrl={profile.avatar_url}
        coverUrl={profile.cover_url}
        editable={isOwner}
        actions={
          <>
            {chatHref ? (
              <Button asChild size="sm" className="rounded-full">
                <Link href={chatHref}>
                  <MessageCircle className="h-4 w-4" />
                  Open chat
                </Link>
              </Button>
            ) : null}
            <ShareButton path={`/candidates/${id}`} title={name} label="Share" />
            {user && user.id !== id ? (
              <ReportBlockMenu currentUserId={user.id} peerId={id} peerName={profile.full_name} />
            ) : null}
          </>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0 space-y-6">
          {profile.profile_video_url ? (
            <div className="overflow-hidden rounded-2xl border border-border bg-black">
              <video src={profile.profile_video_url} controls playsInline className="aspect-video w-full" />
            </div>
          ) : null}

          {profile.bio ? (
            <Card className="shadow-none">
              <CardContent className="p-5 sm:p-6">
                <h2 className="mb-2 font-heading text-sm font-semibold">About</h2>
                <p className="font-body text-sm leading-relaxed text-muted-foreground">{profile.bio}</p>
              </CardContent>
            </Card>
          ) : null}

          {student?.university || student?.degree || student?.graduation_year ? (
            <Card className="shadow-none">
              <CardContent className="p-5 sm:p-6">
                <h2 className="mb-3 font-heading text-sm font-semibold">Education</h2>
                <div className="flex gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                    <GraduationCap className="h-5 w-5 text-foreground" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-heading text-sm font-semibold text-foreground">
                      {student?.university || "University"}
                    </p>
                    <p className="mt-0.5 font-body text-sm text-muted-foreground">
                      {[student?.degree, student?.graduation_year ? `Class of ${student.graduation_year}` : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {student?.skills?.length ? (
            <Card className="shadow-none">
              <CardContent className="p-5 sm:p-6">
                <h2 className="mb-3 font-heading text-sm font-semibold">Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {student.skills.map((s: string) => (
                    <Badge key={s} variant="secondary" className="font-normal">
                      {s}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          <ProfilePosts
            profileUserId={id}
            headline={school || "Student"}
            currentUser={
              user && viewer
                ? {
                    id: user.id,
                    fullName: viewer.full_name || "You",
                    avatarUrl: viewer.avatar_url,
                    role: (viewer.role as UserRole) || "student",
                    headline: null,
                    bio: viewer.bio,
                    profilePath: profileSharePath(viewer.role, user.id),
                  }
                : null
            }
          />
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <Card className="shadow-none">
            <CardContent className="p-5">
              <h2 className="mb-3 font-heading text-sm font-semibold">Credentials</h2>
              {links.length > 0 ? (
                <ul className="m-0 list-none space-y-1 p-0">
                  {links.map(({ href, label, icon: Icon }) => (
                    <li key={label}>
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2.5 rounded-xl px-2 py-2 font-body text-sm text-foreground transition-colors hover:bg-muted"
                      >
                        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        {label}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="font-body text-sm text-muted-foreground">No public links yet.</p>
              )}
            </CardContent>
          </Card>

          {!user ? (
            <Button asChild className="w-full rounded-full">
              <Link href={`/login?next=${encodeURIComponent(`/candidates/${id}`)}`}>Sign in to connect</Link>
            </Button>
          ) : null}
        </aside>
      </div>
    </div>
  )
}
