import { NextResponse } from "next/server"
import { sendMail, siteUrl } from "@/lib/email/mailer"
import { employerInviteEmail } from "@/lib/email/templates"
import { requireCampusStaff } from "@/lib/campus/staff-api"

export const runtime = "nodejs"

export async function POST(request: Request) {
  const staff = await requireCampusStaff()
  if ("error" in staff) return staff.error

  const body = (await request.json().catch(() => null)) as Record<string, string | undefined> | null
  const companyName = body?.companyName?.trim()
  const contactEmail = body?.contactEmail?.trim().toLowerCase()
  const university = (body?.university?.trim() || staff.university || "").trim()
  if (!companyName || !contactEmail || !university) {
    return NextResponse.json({ error: "Company, email, and university are required." }, { status: 400 })
  }

  const { data, error } = await staff.admin
    .from("employer_invitations")
    .insert({
      university,
      company_name: companyName,
      contact_name: body?.contactName?.trim() || null,
      contact_email: contactEmail,
      phone: body?.phone?.trim() || null,
      website: body?.website?.trim() || null,
      sector: body?.sector?.trim() || null,
      message: body?.message?.trim() || null,
      invited_by: staff.user.id,
      status: "invited",
    })
    .select("token")
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const token = data?.token
  const inviteUrl = `${siteUrl()}/invite/employer/${token}`
  const tpl = employerInviteEmail({
    companyName,
    university,
    contactName: body?.contactName,
    message: body?.message,
    inviteUrl,
  })
  const sent = await sendMail({ to: contactEmail, subject: tpl.subject, html: tpl.html, text: tpl.text })
  return NextResponse.json({
    ok: true,
    inviteUrl,
    emailed: sent.ok,
    emailSkipped: Boolean(sent.ok === false && "skipped" in sent && sent.skipped),
  })
}
