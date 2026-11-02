import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { AcceptEmployerInvite } from "@/components/portal/AcceptEmployerInvite"

export default async function EmployerInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  let invite: { company_name: string; university: string; status: string; expires_at: string | null } | null = null
  try {
    const admin = createAdminClient()
    const { data } = await admin.from("employer_invitations").select("company_name, university, status, expires_at").eq("token", token).maybeSingle()
    invite = data
  } catch {
    invite = null
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 px-4 py-16">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">Campus invitation</h1>
      {!invite ? (
        <p className="text-sm text-muted-foreground">This invitation is missing or the table hasn’t been migrated yet.</p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            The career office at {invite.university} invited {invite.company_name} to share roles with its students on SwypeJobs.
          </p>
          {invite.status === "accepted" ? <p className="text-sm">Already accepted. Open Partnerships to post to this campus.</p> : null}
          {!user ? (
            <div className="flex flex-wrap gap-2 text-sm">
              <Link className="text-primary hover:underline" href={`/login?next=/invite/employer/${token}`}>
                Sign in
              </Link>
              <Link className="text-primary hover:underline" href={`/signup?role=recruiter&next=/invite/employer/${token}`}>
                Create employer account
              </Link>
            </div>
          ) : (
            <AcceptEmployerInvite token={token} />
          )}
        </>
      )}
    </div>
  )
}
