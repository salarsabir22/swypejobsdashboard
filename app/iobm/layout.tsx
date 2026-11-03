import type { Metadata } from "next"
import Link from "next/link"
import { CoBrand } from "@/components/sso/CoBrand"
import { Logo } from "@/components/brand/Logo"

export const metadata: Metadata = {
  title: "IoBM Career Development Center · swypejobs",
  description:
    "Sign in to the IoBM Career Development Center. Students, alumni, faculty, staff, and employers each have their own login.",
  openGraph: {
    title: "IoBM Career Development Center · swypejobs",
    description:
      "Jobs, internships, events, career fairs, and advising for Institute of Business Management.",
  },
}

export default function IobmLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-[#051C2C]">
      <div className="h-1.5 bg-[#051C2C]" aria-hidden />
      <header className="border-b border-[#051C2C]/10 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-8">
          <Link href="/iobm" aria-label="IoBM Career Development Center home">
            <CoBrand priority />
          </Link>
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center text-sm text-[#051C2C]/65 underline-offset-4 hover:text-[#051C2C] hover:underline"
          >
            Not IoBM? Main sign-in
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-5 py-10 sm:px-8 sm:py-14">{children}</main>
      <footer className="border-t border-[#051C2C]/10 bg-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-5 py-6 text-[12px] text-[#051C2C]/55 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>Career Development Center · Institute of Business Management · Korangi Creek, Karachi</p>
          <p className="inline-flex items-center gap-2">
            <span>Powered by</span>
            <Logo size={18} />
          </p>
        </div>
      </footer>
    </div>
  )
}
