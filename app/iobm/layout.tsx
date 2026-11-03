import type { Metadata } from "next"
import Link from "next/link"
import { CoBrand } from "@/components/sso/CoBrand"

export const metadata: Metadata = {
  title: "Sign in | IoBM Career Development Center",
  description: "Sign in to the IoBM Career Development Center. Students, alumni, faculty, staff, and employers each have their own path.",
}

export default function IobmLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white text-[#111111]">
      <header className="border-b border-[#111111]/10 bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link href="/iobm" aria-label="IoBM Career Development Center home">
            <CoBrand priority />
          </Link>
          <Link
            href="/login"
            className="inline-flex min-h-11 items-center text-[13px] text-[#5C6370] underline-offset-4 hover:text-[#111111] hover:underline"
          >
            Not IoBM?
          </Link>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-5 py-10 sm:px-8 sm:py-14">{children}</main>
      <footer className="border-t border-[#111111]/10 bg-white">
        <div className="mx-auto max-w-5xl px-5 py-6 text-[12px] text-[#5C6370] sm:px-8">
          Institute of Business Management · Career Development Center · Korangi Creek, Karachi
        </div>
      </footer>
    </div>
  )
}
