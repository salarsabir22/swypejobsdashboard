import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, LogIn, UserPlus } from "lucide-react"
import { EmployerContinue } from "@/components/sso/EmployerContinue"
import { FacultyRolePicker } from "@/components/sso/FacultyRolePicker"
import { IobmSsoButton } from "@/components/sso/IobmSsoButton"
import { iobmOutlineBtn, iobmPrimaryBtn } from "@/lib/sso/brand"
import { IOBM_PORTAL_ICONS } from "@/lib/sso/iobm-icons"
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
  const Icon = IOBM_PORTAL_ICONS[portal]

  return (
    <div className="mx-auto w-full max-w-lg">
      <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-[#C41E3A] text-white">
        <Icon className="size-5" aria-hidden />
      </span>
      <p className="mt-4 text-[13px] font-medium uppercase tracking-[0.16em] text-[#C41E3A]">{IOBM_UNIVERSITY_NAME}</p>
      <h1 className="mt-3 text-[clamp(1.9rem,4vw,2.6rem)] font-semibold leading-[1.08] tracking-[-0.04em] text-[#111111]">
        {copy.title}
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-[#5C6370]">{copy.body}</p>

      {query.error ? (
        <p className="mt-5 rounded-xl border border-[#C41E3A]/30 bg-[#C41E3A]/[0.06] px-4 py-3 text-sm text-[#111111]">
          {query.error}
        </p>
      ) : null}

      <div className="mt-8 space-y-3">
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
            <p className="text-[13px] leading-relaxed text-[#5C6370]">
              Alumni without an active IoBM mailbox can claim access with a personal Google account. The CDC can still
              verify the record later.
            </p>
          </>
        ) : null}
        {portal === "employer" ? (
          <>
            <EmployerContinue mode="login" className={iobmPrimaryBtn}>
              <LogIn className="size-4" aria-hidden />
              Employer sign in
            </EmployerContinue>
            <EmployerContinue mode="signup" className={iobmOutlineBtn}>
              <UserPlus className="size-4" aria-hidden />
              Create an employer account
            </EmployerContinue>
            <p className="text-[13px] leading-relaxed text-[#5C6370]">
              After you sign in, request a partnership with the IoBM Career Development Center to share roles with this
              campus.
            </p>
          </>
        ) : null}
      </div>

      <p className="mt-8 text-sm">
        <Link
          href="/iobm"
          className="inline-flex items-center gap-1.5 font-medium text-[#C41E3A] underline-offset-4 hover:underline"
        >
          <ArrowLeft className="size-4" aria-hidden />
          All IoBM logins
        </Link>
      </p>
    </div>
  )
}
