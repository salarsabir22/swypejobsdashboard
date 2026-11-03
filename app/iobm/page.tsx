import Link from "next/link"
import { IobmMark } from "@/components/brand/IobmMark"
import { IOBM_MODULE_ICONS, IOBM_PORTAL_ICONS, IOBM_STAFF_ICONS } from "@/lib/sso/iobm-icons"
import { IOBM_PORTAL_COPY, IOBM_STAFF_ROLES } from "@/lib/sso/iobm"

const PORTALS = [
  { href: "/iobm/login/student", id: "student" as const },
  { href: "/iobm/login/alumni", id: "alumni" as const },
  { href: "/iobm/login/faculty", id: "faculty" as const },
  { href: "/iobm/login/employer", id: "employer" as const },
]

const MODULES = [
  { icon: IOBM_MODULE_ICONS.jobs, title: "Jobs and internships", body: "Campus-approved roles, applications, and experiential learning records." },
  { icon: IOBM_MODULE_ICONS.events, title: "Events and career fairs", body: "Workshops, info sessions, and fair registration when the CDC opens them." },
  { icon: IOBM_MODULE_ICONS.advising, title: "Career advising", body: "Book appointments with the Career Development Center and keep your profile current." },
  { icon: IOBM_MODULE_ICONS.sso, title: "IoBM campus SSO", body: "Students, alumni, and staff sign in with IoBM identity. Employers use a work email." },
]

const card =
  "rounded-2xl border border-[#111111]/12 bg-white p-5 transition-colors hover:border-[#C41E3A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C41E3A] focus-visible:ring-offset-2"

export default async function IobmLandingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  return (
    <div className="space-y-12">
      {error ? (
        <p className="rounded-xl border border-[#C41E3A]/30 bg-[#C41E3A]/[0.06] px-4 py-3 text-sm text-[#111111]">{error}</p>
      ) : null}

      <section className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
        <IobmMark size={88} priority />
        <div className="max-w-xl">
          <p className="text-[13px] font-medium uppercase tracking-[0.16em] text-[#C41E3A]">
            Career Development Center
          </p>
          <h1 className="mt-2 text-balance text-[clamp(2rem,4.4vw,3.1rem)] font-semibold leading-[1.08] tracking-[-0.04em] text-[#111111]">
            Sign in to IoBM careers
          </h1>
          <p className="mt-3 max-w-[52ch] text-[16px] leading-relaxed text-[#5C6370]">
            Official entry for IoBM students, alumni, faculty, staff, and hiring partners.
          </p>
        </div>
      </section>

      <section aria-label="Choose how you sign in">
        <div className="grid gap-3 sm:grid-cols-2">
          {PORTALS.map((portal) => {
            const Icon = IOBM_PORTAL_ICONS[portal.id]
            const copy = IOBM_PORTAL_COPY[portal.id]
            return (
              <Link key={portal.id} href={portal.href} className={`${card} group min-h-[11rem]`}>
                <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-[#C41E3A] text-white">
                  <Icon className="size-5" aria-hidden />
                </span>
                <h2 className="mt-4 text-[1.25rem] font-semibold tracking-[-0.03em] text-[#111111]">{copy.title}</h2>
                <p className="mt-1 text-[13px] font-medium text-[#C41E3A]">{copy.kicker}</p>
                <p className="mt-2 text-[14px] leading-relaxed text-[#5C6370]">{copy.body}</p>
              </Link>
            )
          })}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="What you can do">
        {MODULES.map((item) => {
          const Icon = item.icon
          return (
            <div key={item.title} className="rounded-2xl border border-[#111111]/10 p-4">
              <Icon className="size-5 text-[#C41E3A]" aria-hidden />
              <h3 className="mt-3 text-[15px] font-semibold text-[#111111]">{item.title}</h3>
              <p className="mt-1 text-[13px] leading-relaxed text-[#5C6370]">{item.body}</p>
            </div>
          )
        })}
      </section>

      <section className="rounded-2xl border border-[#111111]/10 p-5 sm:p-6">
        <h2 className="text-lg font-semibold tracking-[-0.03em] text-[#111111]">Faculty and staff roles</h2>
        <p className="mt-1 max-w-[60ch] text-[14px] text-[#5C6370]">
          Choose Faculty/Staff login, then your campus role.
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {IOBM_STAFF_ROLES.map((role) => {
            const Icon = IOBM_STAFF_ICONS[role.id]
            return (
              <li key={role.id} className="flex gap-3 rounded-xl border border-[#111111]/10 px-4 py-3">
                <Icon className="mt-0.5 size-4 shrink-0 text-[#C41E3A]" aria-hidden />
                <div>
                  <p className="text-[14px] font-semibold text-[#111111]">{role.label}</p>
                  <p className="mt-1 text-[13px] leading-relaxed text-[#5C6370]">{role.description}</p>
                </div>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
