import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const runtime = "nodejs"

export async function POST(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 })

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
  if (profile?.role !== "recruiter") {
    return NextResponse.json({ error: "Sign in with an employer account to accept." }, { status: 403 })
  }

  const admin = createAdminClient()
  const { data: invite, error } = await admin.from("employer_invitations").select("*").eq("token", token).maybeSingle()
  if (error || !invite) return NextResponse.json({ error: "Invitation not found." }, { status: 404 })
  if (invite.status === "accepted") return NextResponse.json({ ok: true, already: true })
  if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: "This invitation has expired." }, { status: 410 })
  }

  const { error: partnerError } = await admin.from("campus_employer_partners").insert({
    university: invite.university,
    recruiter_id: user.id,
    company_name: invite.company_name,
    tier: "preferred",
    notes: "Accepted campus invitation",
  })
  if (partnerError && !/duplicate|unique/i.test(partnerError.message)) {
    return NextResponse.json({ error: partnerError.message }, { status: 500 })
  }

  await admin
    .from("employer_invitations")
    .update({ status: "accepted", accepted_by: user.id })
    .eq("id", invite.id)

  return NextResponse.json({ ok: true })
}
