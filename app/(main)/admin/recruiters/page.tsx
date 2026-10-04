import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { formatDate } from "@/lib/utils"
import { Building2 } from "lucide-react"
import { ApproveButton } from "./ApproveButton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type ProfileEmbed = { full_name?: string | null; created_at?: string }

export default async function AdminRecruitersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: currentProfile } = await supabase.from("profiles").select("role").eq("id", user.id).single()
  if (currentProfile?.role !== "admin") redirect("/discover")

  const { data: recruiters } = await supabase
    .from("recruiter_profiles")
    .select("*, profiles(full_name, avatar_url, created_at)")
    .order("created_at", { ascending: false })

  const pending = recruiters?.filter((r) => !r.is_approved).length || 0

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <h1 className="font-heading text-2xl font-bold">Recruiter Approvals</h1>
        <p className="font-body text-sm text-muted-foreground">{pending} pending</p>
      </div>

      {pending > 0 ? (
        <Alert>
          <Building2 className="h-4 w-4" />
          <AlertTitle>Action required</AlertTitle>
          <AlertDescription>
            {pending} recruiter{pending > 1 ? "s" : ""} awaiting approval
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-3">
        {!recruiters?.length ? (
          <Card className="py-16 text-center">
            <CardHeader>
              <CardTitle>No recruiter profiles yet</CardTitle>
              <CardDescription>New company accounts will land here for review.</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          recruiters.map((recruiter) => {
            const profile = recruiter.profiles as ProfileEmbed | null
            return (
              <Card key={recruiter.id}>
                <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted">
                      {recruiter.logo_url ? (
                        <img src={recruiter.logo_url} className="h-full w-full object-cover" alt="" />
                      ) : (
                        <Building2 className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-base">{recruiter.company_name}</CardTitle>
                      <CardDescription>{profile?.full_name}</CardDescription>
                      <p className="font-data text-[10px] text-muted-foreground">
                        Joined {profile?.created_at ? formatDate(profile.created_at) : " - "}
                      </p>
                    </div>
                  </div>
                  <Badge variant={recruiter.is_approved ? "secondary" : "default"}>
                    {recruiter.is_approved ? "Approved" : "Pending"}
                  </Badge>
                </CardHeader>
                {recruiter.description ? (
                  <CardContent>
                    <p className="font-body text-sm text-muted-foreground">{recruiter.description}</p>
                  </CardContent>
                ) : null}
                <CardContent className={recruiter.description ? "pt-0" : undefined}>
                  <ApproveButton recruiterId={recruiter.id} isApproved={recruiter.is_approved} />
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
