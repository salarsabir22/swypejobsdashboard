"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import type { UserRole } from "@/types"

const YEAR = new Date().getFullYear()

const focusRing =
  "rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--waitlist-blue)]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050506]"

const linkClass = `${focusRing} text-[14px] text-white/45 transition-colors duration-200 hover:text-[var(--waitlist-blue)]`

type FooterLink = { href: string; label: string }
type FooterCol = { title: string; links: FooterLink[] }

function columnsFor(role: UserRole | "admin"): { cols: FooterCol[]; cta: FooterLink; blurb: string } {
  if (role === "recruiter") {
    return {
      blurb:
        "Shortlist with intent. Live jobs stay on Discover, pipeline lives on Matches, and chat opens only after a mutual match.",
      cta: { href: "/jobs/new", label: "Post a job" },
      cols: [
        {
          title: "Hiring",
          links: [
            { href: "/discover", label: "Shortlist talent" },
            { href: "/jobs", label: "Your listings" },
            { href: "/matches", label: "Pipeline" },
            { href: "/chat", label: "Candidate messages" },
          ],
        },
        {
          title: "Campus",
          links: [
            { href: "/feed", label: "Team updates" },
            { href: "/community", label: "Topic rooms" },
            { href: "/dashboard", label: "Hiring insights" },
            { href: "/profile", label: "Company page" },
          ],
        },
        {
          title: "Support",
          links: [
            { href: "/onboarding", label: "Edit company" },
            { href: "/feedback", label: "Send feedback" },
          ],
        },
      ],
    }
  }

  if (role === "admin") {
    return {
      blurb: "Moderation, approvals, and reports for the swypejobs campus network.",
      cta: { href: "/admin", label: "Open console" },
      cols: [
        {
          title: "Console",
          links: [
            { href: "/admin", label: "Overview" },
            { href: "/admin/users", label: "Members" },
            { href: "/admin/recruiters", label: "Approvals" },
            { href: "/admin/reports", label: "Reports" },
          ],
        },
        {
          title: "Content",
          links: [
            { href: "/admin/channels", label: "Channels" },
            { href: "/feed", label: "Public feed" },
            { href: "/community", label: "Community" },
          ],
        },
        {
          title: "Help",
          links: [
            { href: "/feedback", label: "Send feedback" },
            { href: "/feed", label: "Review feed" },
          ],
        },
      ],
    }
  }

  return {
    blurb:
      "You’re in. Keep your profile complete, swipe roles that fit, and message a team only after both sides match.",
    cta: { href: "/discover", label: "Open Discover" },
    cols: [
      {
        title: "Your search",
        links: [
          { href: "/discover", label: "Roles for you" },
          { href: "/matches", label: "Applications" },
          { href: "/chat", label: "Messages" },
          { href: "/profile", label: "Your profile" },
        ],
      },
      {
        title: "Campus",
        links: [
          { href: "/feed", label: "Student feed" },
          { href: "/community", label: "Topic rooms" },
          { href: "/dashboard", label: "Your insights" },
        ],
      },
        {
          title: "Support",
          links: [
            { href: "/onboarding", label: "Edit profile" },
            { href: "/profile#saved", label: "Saved roles" },
            { href: "/feedback", label: "Send feedback" },
          ],
        },
    ],
  }
}

export function AppFooter({ role }: { role: UserRole | "admin" }) {
  const pathname = usePathname()
  if (pathname.startsWith("/chat")) return null

  const { cols, cta, blurb } = columnsFor(role)
  const lockMobile = pathname === "/discover"

  return (
    <>
      {role !== "admin" && !lockMobile ? (
        <div className="h-[var(--app-tabbar-clearance)] lg:hidden" aria-hidden />
      ) : null}
    <footer
      role="contentinfo"
      aria-labelledby="app-footer-brand-heading"
      className="footer-premium-surface relative mt-8 hidden w-full overflow-hidden text-white lg:mt-12 lg:block"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-20 h-px bg-gradient-to-r from-transparent via-white/[0.18] to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-[18%] left-1/2 z-0 -translate-x-1/2 select-none whitespace-nowrap font-semibold tracking-[-0.06em] text-white/[0.022]"
        style={{ fontSize: "clamp(5rem, 22vw, 16rem)" }}
        aria-hidden
      >
        swypejobs
      </div>

      <div
        className="relative z-10 px-[clamp(1.25rem,5vw,4.5rem)]"
      >
        <div className="flex w-full flex-col gap-10 border-b border-white/[0.07] py-12 sm:gap-12 sm:py-14 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl">
            <p
              id="app-footer-brand-heading"
              className="text-[10px] font-semibold uppercase tracking-[0.28em] text-white/30"
            >
              swypejobs
            </p>
            <Link
              href="/discover"
              className={`${focusRing} mt-3 inline-block text-[clamp(1.75rem,4vw,2.75rem)] font-semibold tracking-[-0.045em] text-white`}
            >
              swypejobs<span className="text-white/35">.</span>
            </Link>
            <p className="mt-5 max-w-md text-pretty text-[15px] leading-[1.65] text-white/48 sm:text-base">
              {blurb}
            </p>
          </div>

          <div className="flex shrink-0 flex-col gap-3 sm:items-end">
            <Button
              asChild
              className="h-12 w-full rounded-full bg-white px-8 text-[14px] font-semibold tracking-[-0.02em] text-[#050506] hover:bg-white/92 sm:w-auto"
            >
              <Link href={cta.href}>{cta.label}</Link>
            </Button>
            <p className="text-center text-[11px] text-white/30 sm:text-right">
              Mutual match still required before chat.
            </p>
          </div>
        </div>

        <nav
          aria-label="App"
          className="grid w-full grid-cols-1 gap-12 border-b border-white/[0.07] py-12 sm:grid-cols-3 sm:gap-8 sm:py-14"
        >
          {cols.map((col) => (
            <section key={col.title}>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/32">{col.title}</h3>
              <ul className="mt-5 flex flex-col gap-3">
                {col.links.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className={linkClass}>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </nav>

        <div className="grid w-full grid-cols-1 gap-6 py-10 text-[12px] sm:py-12 lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:gap-4">
          <p className="text-white/32 tabular-nums tracking-[-0.01em] lg:justify-self-start">
            © {YEAR} swypejobs. All rights reserved.
          </p>
          <p className="text-center text-[11px] font-medium uppercase tracking-[0.35em] text-white/22 lg:px-6">
            Discover · Match · Chat
          </p>
          <nav aria-label="Legal" className="flex flex-wrap items-center gap-x-8 gap-y-2 lg:justify-self-end">
            <Link href="/privacy" className={`${focusRing} text-white/35 transition-colors hover:text-[var(--waitlist-blue)]`}>
              Privacy
            </Link>
            <Link href="/terms" className={`${focusRing} text-white/35 transition-colors hover:text-[var(--waitlist-blue)]`}>
              Terms
            </Link>
          </nav>
        </div>
      </div>
    </footer>
    </>
  )
}
