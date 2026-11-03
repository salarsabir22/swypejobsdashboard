import type { Metadata } from "next"
import Link from "next/link"
import { CoBrand } from "@/components/sso/CoBrand"

export const metadata: Metadata = {
  title: "IoBM Career Development Center · swypejobs",
  description:
    "Sign in to the IoBM Career Development Center with campus SSO. Students, alumni, faculty, staff, and employers each have their own path.",
  openGraph: {
    title: "IoBM Career Development Center · swypejobs",
    description:
      "Jobs, internships, events, career fairs, and advising for Institute of Business Management — with IoBM SSO.",
  },
}

export default function IobmLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#051C2C] text-white">
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none fixed -left-24 top-[-8rem] h-[28rem] w-[28rem] rounded-full bg-[#2251FF]/35 blur-[90px]"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed -right-16 bottom-[-6rem] h-[24rem] w-[24rem] rounded-full bg-white/10 blur-[80px]"
        aria-hidden
      />

      <div className="relative mx-auto flex min-h-screen max-w-5xl flex-col px-5 py-6 sm:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/iobm" aria-label="IoBM Career Development Center home">
            <CoBrand priority />
          </Link>
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center rounded-full px-3 text-sm text-white/70 underline-offset-4 hover:text-white hover:underline"
          >
            Not IoBM? Main sign-in
          </Link>
        </header>
        <div className="flex flex-1 flex-col py-10 sm:py-14">{children}</div>
        <footer className="border-t border-white/10 py-6 text-[12px] text-white/55">
          Institute of Business Management Career Development Center · Korangi Creek, Karachi · with swypejobs
        </footer>
      </div>
    </div>
  )
}
