import Link from "next/link"
import { notFound } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FacultyRolePicker } from "@/components/sso/FacultyRolePicker"
import { IobmSsoButton } from "@/components/sso/IobmSsoButton"
import { IOBM_PORTAL_COPY, IOBM_UNIVERSITY_NAME, isIobmPortal } from "@/lib/sso/iobm"

export default async function IobmPortalLoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ portal: string }>
  searchParams: Promise<{ error?: string; staff_role?: string }>
}) {
  const { portal } = await params
  const query = await searchParams
  if (!isIobmPortal(portal)) notFound()
  const copy = IOBM_PORTAL_COPY[portal]

  return (
    <div className="mx-auto w-full max-w-md">
      <Card className="border-[#051C2C]/10 shadow-[0_18px_50px_-28px_rgba(5,28,44,0.35)]">
        <CardHeader>
          <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#051C2C]/45">{IOBM_UNIVERSITY_NAME}</p>
          <CardTitle className="text-[1.7rem] tracking-[-0.04em] text-[#051C2C]">{copy.title}</CardTitle>
          <CardDescription className="text-[15px] leading-relaxed text-[#051C2C]/65">{copy.body}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {query.error ? (
            <p className="rounded-xl border border-[#051C2C]/15 bg-[#051C2C]/[0.04] px-4 py-3 text-sm text-[#051C2C]">
              {query.error}
            </p>
          ) : null}

          {portal === "faculty" ? <FacultyRolePicker initialRole={query.staff_role} /> : null}

          {portal === "student" ? <IobmSsoButton portal="student" label={copy.ssoLabel} /> : null}

          {portal === "alumni" ? (
            <>
              <IobmSsoButton portal="alumni" label="Continue with IoBM SSO" />
              <IobmSsoButton
                portal="alumni"
                identityClaim
                variant="outline"
                label="I no longer have a campus email"
              />
              <p className="text-[13px] leading-relaxed text-[#051C2C]/55">
                Alumni without an active IoBM mailbox can claim access with a personal Google account. The CDC can still
                verify the record later.
              </p>
            </>
          ) : null}

          {portal === "employer" ? (
            <>
              <Link
                href="/login?next=/partnerships"
                className="flex h-12 min-h-11 w-full items-center justify-center rounded-xl bg-[#051C2C] text-[15px] font-semibold text-white hover:bg-[#2251FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2251FF] focus-visible:ring-offset-2"
              >
                Employer sign in
              </Link>
              <Link
                href={`/signup?role=recruiter&university=${encodeURIComponent(IOBM_UNIVERSITY_NAME)}`}
                className="flex h-12 min-h-11 w-full items-center justify-center rounded-xl border-2 border-[#051C2C] text-[15px] font-semibold text-[#051C2C] hover:bg-[#051C2C]/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2251FF]"
              >
                Create an employer account
              </Link>
              <p className="text-[13px] leading-relaxed text-[#051C2C]/55">
                After you sign in, request a partnership with the IoBM Career Development Center to share roles with
                this campus.
              </p>
            </>
          ) : null}
        </CardContent>
      </Card>

      <p className="mt-6 text-center text-sm text-[#051C2C]/55">
        <Link href="/iobm" className="font-medium text-[#2251FF] underline-offset-4 hover:underline">
          All IoBM logins
        </Link>
      </p>
    </div>
  )
}
