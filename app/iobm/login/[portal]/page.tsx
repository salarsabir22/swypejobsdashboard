import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, LogIn, UserPlus } from "lucide-react"
import { CoBrand } from "@/components/sso/CoBrand"
import { EmployerContinue } from "@/components/sso/EmployerContinue"
import { FacultyRolePicker } from "@/components/sso/FacultyRolePicker"
import { IobmSsoButton } from "@/components/sso/IobmSsoButton"
import { iobmOutlineBtn, iobmPrimaryBtn } from "@/lib/sso/brand"
import { IOBM_PORTAL_COPY, isIobmPortal } from "@/lib/sso/iobm"

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
    <div className="w-full max-w-[400px] rounded-[28px] border border-[#111111]/10 bg-white px-7 py-8 text-center shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
      <CoBrand size={32} priority className="justify-center" />
      <h1 className="mt-5 text-[24px] font-normal leading-8 tracking-[-0.02em] text-[#111111]">Sign in</h1>
      <p className="mt-1 text-[14px] leading-5 text-[#5C6370]">{copy.kicker}</p>
      <p className="mt-3 text-[13px] leading-5 text-[#5C6370]">{copy.body}</p>

      {query.error ? (
        <p className="mt-4 rounded-lg border border-[#C41E3A]/30 bg-[#C41E3A]/[0.06] px-3 py-2 text-left text-[13px] text-[#111111]">
          {query.error}
        </p>
      ) : null}

      <div className={`mt-6 space-y-2 ${portal === "faculty" ? "text-left" : ""}`}>
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
            <p className="text-[12px] leading-5 text-[#5C6370]">
              Alumni without an IoBM mailbox can continue with a personal Google account.
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
            <p className="text-[12px] leading-5 text-[#5C6370]">
              After sign-in, request an IoBM CDC partnership to share roles with this campus.
            </p>
          </>
        ) : null}
      </div>

      <p className="mt-5">
        <Link
          href="/iobm"
          className="inline-flex min-h-10 items-center gap-1 text-[13px] font-medium text-[#C41E3A] underline-offset-4 hover:underline"
        >
          <ArrowLeft className="size-3.5" aria-hidden />
          All IoBM logins
        </Link>
      </p>
    </div>
  )
}
