import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Sign in | IoBM Career Development Center",
  description: "Sign in to the IoBM Career Development Center. Students, alumni, faculty, staff, and employers each have their own path.",
}

export default function IobmLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#F5F5F5] text-[#111111]">
      <header className="flex h-12 items-center justify-end px-4">
        <Link
          href="/login"
          className="inline-flex min-h-10 items-center text-[13px] text-[#5C6370] underline-offset-4 hover:text-[#111111] hover:underline"
        >
          Not IoBM?
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-6">{children}</main>
    </div>
  )
}
