import Link from "next/link"
import { notFound } from "next/navigation"
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
    <div className="mx-auto w-full max-w-lg">
      <p className="text-[13px] font-medium uppercase tracking-[0.18em] text-[#9BB4FF]">
        {IOBM_UNIVERSITY_NAME}
      </p>
      <h1 className="mt-3 text-[clamp(1.9rem,4vw,2.6rem)] font-semibold leading-[1.08] tracking-[-0.045em]">
        {copy.title}
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-white/70">{copy.body}</p>

      {query.error ? (
        <p className="mt-5 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white">
          {query.error}
        </p>
      ) : null}

      <div className="mt-8 space-y-3">
        {portal === "faculty" ? (
          <FacultyRolePicker initialRole={query.staff_role} />
        ) : null}

        {portal === "student" ? (
          <IobmSsoButton portal="student" label={copy.ssoLabel} />
        ) : null}

        {portal === "alumni" ? (
          <>
            <IobmSsoButton portal="alumni" label="Continue with IoBM SSO" />
            <IobmSsoButton
              portal="alumni"
              identityClaim
              variant="outline"
              label="I no longer have a campus email"
            />
            <p className="text-[13px] leading-relaxed text-white/55">
              Alumni without an active IoBM mailbox can claim alumni access with a personal Google account. The CDC
              can still verify the record later.
            </p>
          </>
        ) : null}

        {portal === "employer" ? (
          <>
            <Link
              href="/login?next=/partnerships"
              className="inline-flex h-12 w-full min-h-11 items-center justify-center rounded-full bg-[#2251FF] text-[15px] font-semibold text-white hover:bg-[#3A66FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Employer sign in
            </Link>
            <Link
              href={`/signup?role=recruiter&university=${encodeURIComponent(IOBM_UNIVERSITY_NAME)}`}
              className="inline-flex h-12 w-full min-h-11 items-center justify-center rounded-full border-2 border-white/30 text-[15px] font-semibold text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              Create an employer account
            </Link>
            <p className="text-[13px] leading-relaxed text-white/55">
              After you sign in, request a partnership with the IoBM Career Development Center to share roles with
              this campus.
            </p>
          </>
        ) : null}
      </div>

      <p className="mt-8 text-sm text-white/55">
        <Link href="/iobm" className="font-medium text-white underline-offset-4 hover:underline">
          All IoBM logins
        </Link>
      </p>
    </div>
  )
}
