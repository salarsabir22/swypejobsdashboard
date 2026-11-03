import Link from "next/link"
import {
  Briefcase,
  Building2,
  CalendarDays,
  GraduationCap,
  Landmark,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react"
import { IOBM_PORTAL_COPY, IOBM_STAFF_ROLES } from "@/lib/sso/iobm"

const PORTALS = [
  { href: "/iobm/login/student", icon: GraduationCap, id: "student" as const },
  { href: "/iobm/login/alumni", icon: Sparkles, id: "alumni" as const },
  { href: "/iobm/login/faculty", icon: Landmark, id: "faculty" as const },
  { href: "/iobm/login/employer", icon: Building2, id: "employer" as const },
]

const MODULES = [
  { icon: Briefcase, title: "Jobs and internships", body: "Campus-approved roles, swipe discovery, applications, and experiential learning records." },
  { icon: CalendarDays, title: "Events and career fairs", body: "Workshops, info sessions, and fair registration when the CDC opens them." },
  { icon: Users, title: "Career advising", body: "Book appointments with the Career Development Center and keep your profile current." },
  { icon: ShieldCheck, title: "IoBM campus SSO", body: "Students, alumni, and staff sign in with IoBM identity. Employers use a work email." },
]

export default async function IobmLandingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  return (
    <div className="space-y-12">
      {error ? (
        <p className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm">{error}</p>
      ) : null}
      <section className="max-w-3xl space-y-4">
        <p className="text-[13px] font-medium uppercase tracking-[0.18em] text-[#9BB4FF]">
          Career Development Center
        </p>
        <h1 className="text-balance text-[clamp(2.1rem,5vw,3.6rem)] font-semibold leading-[1.05] tracking-[-0.045em]">
          Sign in to IoBM careers with campus SSO.
        </h1>
        <p className="max-w-[54ch] text-[17px] leading-relaxed text-white/75">
          One entry for every IoBM role — students, alumni, faculty, CDC staff, coordinators, and hiring partners —
          with the IoBM mark beside swypejobs.
        </p>
      </section>

      <section aria-label="Choose how you sign in">
        <div className="grid gap-3 sm:grid-cols-2">
          {PORTALS.map((portal) => {
            const Icon = portal.icon
            const copy = IOBM_PORTAL_COPY[portal.id]
            return (
              <Link
                key={portal.id}
                href={portal.href}
                className="group min-h-[11rem] rounded-3xl border border-white/15 bg-white/[0.07] p-5 transition-colors hover:border-[#2251FF] hover:bg-white/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2251FF] focus-visible:ring-offset-2 focus-visible:ring-offset-[#051C2C]"
              >
                <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-[#2251FF] text-white">
                  <Icon className="size-5" aria-hidden />
                </span>
                <h2 className="mt-4 text-[1.35rem] font-semibold tracking-[-0.03em]">{copy.title}</h2>
                <p className="mt-1 text-[13px] font-medium text-[#9BB4FF]">{copy.kicker}</p>
                <p className="mt-2 text-[14px] leading-relaxed text-white/70">{copy.body}</p>
              </Link>
            )
          })}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="What you can do">
        {MODULES.map((item) => {
          const Icon = item.icon
          return (
            <div key={item.title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <Icon className="size-5 text-[#9BB4FF]" aria-hidden />
              <h3 className="mt-3 text-[15px] font-semibold">{item.title}</h3>
              <p className="mt-1 text-[13px] leading-relaxed text-white/65">{item.body}</p>
            </div>
          )
        })}
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-6">
        <h2 className="text-lg font-semibold tracking-[-0.03em]">Faculty and staff roles mapped from SSO</h2>
        <p className="mt-1 max-w-[60ch] text-[14px] text-white/65">
          IoBM identity can land you in any career-office seat. Pick Faculty/Staff login, then your campus role.
        </p>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {IOBM_STAFF_ROLES.map((role) => (
            <li key={role.id} className="rounded-2xl border border-white/10 px-4 py-3">
              <p className="text-[14px] font-semibold">{role.label}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-white/60">{role.description}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
