import Link from "next/link"
import { Logo } from "@/components/brand/Logo"

/** Static swipe-card illustration: two cards behind, one in front, and a match pill. */
function CardsVisual() {
  return (
    <div className="relative mx-auto h-[360px] w-full max-w-[340px]" aria-hidden>
      <div className="absolute inset-x-6 top-6 h-[300px] rotate-[-7deg] rounded-[24px] bg-white/20" />
      <div className="absolute inset-x-3 top-3 h-[310px] rotate-[4deg] rounded-[24px] bg-white/45" />
      <div className="lp-float absolute inset-x-0 top-0 flex h-[320px] flex-col rounded-[24px] bg-white p-6 text-[#14102e] shadow-[0_40px_80px_-30px_rgba(10,0,80,0.7)]">
        <p className="text-[12px] text-[#55506b]">Internship · Lahore</p>
        <p className="mt-5 text-[1.9rem] font-semibold leading-[1.03] tracking-[-0.045em]">Engineering intern</p>
        <p className="mt-2 text-[15px] font-medium text-[#5a48ff]">Systems Limited</p>
        <div className="mt-auto space-y-3">
          <p className="rounded-xl bg-[#e9e6ff] px-3.5 py-3 text-[14px] font-medium text-[#251c4d]">PKR 80–120k / month</p>
          <ul className="flex flex-wrap gap-1.5">
            {["TypeScript", "APIs", "Hybrid"].map((tag) => (
              <li key={tag} className="rounded-full border border-[#14102e]/20 px-2.5 py-1 text-[12px] text-[#55506b]">
                {tag}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="lp-float-slow absolute -right-3 bottom-2 flex items-center gap-2 rounded-full bg-[var(--lp-mint)] px-4 py-2.5 text-[13px] font-semibold text-[#06241a] shadow-lg">
        <span aria-hidden className="size-2 rounded-full bg-[#06241a]" />
        It&apos;s a match
      </div>
    </div>
  )
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="lp grid min-h-screen bg-background text-foreground selection:bg-primary selection:text-white lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-[radial-gradient(ellipse_80%_60%_at_20%_0%,#7a6bff,transparent_70%),linear-gradient(160deg,#5a48ff,#3a2bc8)] p-12 text-white lg:flex xl:p-16">
        <div className="lp-grid pointer-events-none absolute inset-0" aria-hidden />
        <Link href="/" className="relative w-fit" aria-label="swypejobs home">
          <Logo size={34} tone="light" />
        </Link>

        <div className="relative">
          <CardsVisual />
        </div>

        <h2 className="relative max-w-[16ch] text-balance text-[clamp(2rem,3.4vw,3rem)] font-semibold leading-[1.02] tracking-[-0.045em]">
          Swipe the jobs you&apos;d actually take.
        </h2>
      </aside>

      {/* Form panel */}
      <div className="flex min-h-screen flex-col">
        <header className="flex h-16 shrink-0 items-center px-5 sm:px-8 lg:hidden">
          <Link href="/" aria-label="swypejobs home">
            <Logo size={30} />
          </Link>
        </header>

        <div className="flex flex-1 flex-col items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-[420px]">{children}</div>
        </div>

        <footer className="shrink-0 px-5 py-6 sm:px-8">
          <p className="text-center text-[12px] text-muted-foreground lg:text-right">
            © {new Date().getFullYear()} swypejobs
          </p>
        </footer>
      </div>
    </div>
  )
}
