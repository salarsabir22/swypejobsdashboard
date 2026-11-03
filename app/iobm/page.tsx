import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { CoBrand } from "@/components/sso/CoBrand"
import { IOBM_PORTAL_ICONS } from "@/lib/sso/iobm-icons"
import { IOBM_PORTAL_COPY } from "@/lib/sso/iobm"

const PORTALS = [
  { href: "/iobm/login/student", id: "student" as const },
  { href: "/iobm/login/alumni", id: "alumni" as const },
  { href: "/iobm/login/faculty", id: "faculty" as const },
  { href: "/iobm/login/employer", id: "employer" as const },
]

export default async function IobmLandingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  return (
    <div className="w-full max-w-[400px] rounded-[28px] border border-[#111111]/10 bg-white px-7 py-8 text-center shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
      <CoBrand size={32} priority className="justify-center" />
      <h1 className="mt-5 text-[24px] font-normal leading-8 tracking-[-0.02em] text-[#111111]">Sign in</h1>
      <p className="mt-1 text-[14px] leading-5 text-[#5C6370]">to IoBM careers</p>

      {error ? (
        <p className="mt-4 rounded-lg border border-[#C41E3A]/30 bg-[#C41E3A]/[0.06] px-3 py-2 text-left text-[13px] text-[#111111]">
          {error}
        </p>
      ) : null}

      <ul className="mt-6 divide-y divide-[#111111]/10 text-left" aria-label="Choose how you sign in">
        {PORTALS.map((portal) => {
          const Icon = IOBM_PORTAL_ICONS[portal.id]
          const copy = IOBM_PORTAL_COPY[portal.id]
          return (
            <li key={portal.id}>
              <Link
                href={portal.href}
                className="flex min-h-11 items-center gap-3 py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C41E3A] focus-visible:ring-offset-2"
              >
                <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[#C41E3A] text-white">
                  <Icon className="size-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-medium text-[#111111]">{copy.title.replace(" Login", "")}</span>
                  <span className="block text-[12px] text-[#5C6370]">{copy.kicker}</span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-[#8A8F98]" aria-hidden />
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
