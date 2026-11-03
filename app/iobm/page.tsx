import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { IOBM_PORTAL_COPY, IOBM_STAFF_ROLES } from "@/lib/sso/iobm"

const LOGINS = [
  { href: "/iobm/login/student", id: "student" as const },
  { href: "/iobm/login/alumni", id: "alumni" as const },
  { href: "/iobm/login/faculty", id: "faculty" as const },
  { href: "/iobm/login/employer", id: "employer" as const },
]

const ACCESS = [
  {
    title: "Jobs and internships",
    body: "Roles employers want IoBM students and alumni for, including CDC-approved campus postings.",
  },
  {
    title: "Events and career fairs",
    body: "Workshops, information sessions, and fair registration when the Career Development Center opens them.",
  },
  {
    title: "Career advising",
    body: "Book appointments with CDC advisors and keep your profile current for recruiting.",
  },
]

const WHO = [
  {
    title: "Students",
    body: "Every current IoBM student signs in with campus SSO to find jobs, internships, events, and advising.",
  },
  {
    title: "Alumni",
    body: "Graduates keep their record, update employment outcomes, browse alumni roles, and opt in to mentorship.",
  },
  {
    title: "Faculty and staff",
    body: "CDC, advisors, coordinators, faculty, deans, and auditors enter through campus SSO with mapped permissions.",
  },
  {
    title: "Employers",
    body: "Hiring partners sign in with a work email, then partner with the CDC to share roles with this campus.",
  },
]

export default async function IobmLandingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  return (
    <div className="space-y-14">
      {error ? (
        <p className="rounded-xl border border-[#051C2C]/15 bg-[#051C2C]/[0.04] px-4 py-3 text-sm">{error}</p>
      ) : null}

      <section className="grid items-start gap-10 lg:grid-cols-[1fr_22rem]">
        <div className="max-w-xl">
          <p className="text-[13px] font-medium uppercase tracking-[0.16em] text-[#051C2C]/50">
            Official career platform
          </p>
          <h1 className="mt-3 text-balance text-[clamp(2rem,4.4vw,3.1rem)] font-semibold leading-[1.08] tracking-[-0.04em] text-[#051C2C]">
            Welcome to IoBM careers
          </h1>
          <p className="mt-4 max-w-[52ch] text-[17px] leading-relaxed text-[#051C2C]/70">
            The Career Development Center uses swypejobs for jobs, internships, events, career fairs, and advising.
            Choose your login below.
          </p>
        </div>

        <Card className="border-[#051C2C]/10 bg-white shadow-[0_18px_50px_-28px_rgba(5,28,44,0.35)]">
          <CardHeader className="pb-3">
            <CardTitle className="text-[1.15rem] text-[#051C2C]">Log in</CardTitle>
            <CardDescription className="text-[#051C2C]/60">
              Students, alumni, and staff use IoBM SSO. Employers use a work email.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {LOGINS.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="flex min-h-12 items-center justify-center rounded-xl bg-[#051C2C] px-4 text-[15px] font-semibold text-white transition-colors hover:bg-[#2251FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2251FF] focus-visible:ring-offset-2"
              >
                {IOBM_PORTAL_COPY[item.id].title}
              </Link>
            ))}
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="access-heading">
        <h2 id="access-heading" className="text-[1.35rem] font-semibold tracking-[-0.03em] text-[#051C2C]">
          What you can access
        </h2>
        <p className="mt-2 max-w-[60ch] text-[15px] leading-relaxed text-[#051C2C]/65">
          IoBM students and alumni can find internships and jobs, register for CDC events and career fairs, and book
          advising appointments.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {ACCESS.map((item) => (
            <Card key={item.title} className="border-[#051C2C]/10 shadow-none">
              <CardHeader>
                <CardTitle className="text-[16px] text-[#051C2C]">{item.title}</CardTitle>
                <CardDescription className="text-[14px] leading-relaxed text-[#051C2C]/65">
                  {item.body}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="who-heading">
        <h2 id="who-heading" className="text-[1.35rem] font-semibold tracking-[-0.03em] text-[#051C2C]">
          Who can use it
        </h2>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {WHO.map((item) => (
            <Card key={item.title} className="border-[#051C2C]/10 shadow-none">
              <CardHeader>
                <CardTitle className="text-[16px] text-[#051C2C]">{item.title}</CardTitle>
                <CardDescription className="text-[14px] leading-relaxed text-[#051C2C]/65">
                  {item.body}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="roles-heading">
        <h2 id="roles-heading" className="text-[1.35rem] font-semibold tracking-[-0.03em] text-[#051C2C]">
          Faculty and staff roles
        </h2>
        <p className="mt-2 max-w-[60ch] text-[15px] leading-relaxed text-[#051C2C]/65">
          Faculty/Staff login maps your IoBM identity onto a CDC seat. Choose your campus role on the next screen.
        </p>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {IOBM_STAFF_ROLES.map((role) => (
            <li key={role.id} className="rounded-xl border border-[#051C2C]/10 px-4 py-3">
              <p className="text-[14px] font-semibold text-[#051C2C]">{role.label}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-[#051C2C]/60">{role.description}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
