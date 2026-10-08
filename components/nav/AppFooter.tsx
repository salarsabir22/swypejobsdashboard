"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/brand/Logo"
import type { UserRole } from "@/types"

const YEAR = new Date().getFullYear()

const focusRing =
  "rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background"

const linkClass = `${focusRing} text-[14px] text-muted-foreground transition-colors duration-200 hover:text-primary`

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

  if (role === "university") {
    return {
      blurb: "Career-office outcomes, engagement, and swipe-level demand for your students.",
      cta: { href: "/campus", label: "Campus home" },
      cols: [
        {
          title: "Insights",
          links: [
            { href: "/campus", label: "Home" },
            { href: "/campus/outcomes", label: "Outcomes" },
            { href: "/campus/engagement", label: "Engagement" },
            { href: "/campus/equity", label: "Equity" },
          ],
        },
        {
          title: "Work",
          links: [
            { href: "/campus/actions", label: "Actions" },
            { href: "/campus/market", label: "Market" },
            { href: "/campus/operations", label: "Operations" },
            { href: "/campus/reports", label: "Reports" },
          ],
        },
        {
          title: "Help",
          links: [{ href: "/feedback", label: "Send feedback" }],
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
            { href: "/admin/employers", label: "Employers" },
            { href: "/admin/safety", label: "Safety" },
            { href: "/campus", label: "Campus" },
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
        className="footer-premium-surface relative mt-8 hidden w-full lg:mt-12 lg:block"
      >
        <div className="px-[clamp(1.25rem,5vw,4.5rem)]">
          <div className="flex w-full flex-col gap-8 border-b border-border py-12 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-xl">
              <Link href="/discover" className={`${focusRing} inline-block`}>
                <Logo size={40} />
              </Link>
              <p className="mt-4 max-w-md text-pretty text-[15px] leading-[1.65] text-muted-foreground">{blurb}</p>
            </div>
            <Button asChild size="lg" className="h-12 w-full rounded-full px-8 text-[14px] font-semibold sm:w-auto">
              <Link href={cta.href}>{cta.label}</Link>
            </Button>
          </div>

          <nav aria-label="App" className="grid w-full grid-cols-1 gap-10 border-b border-border py-12 sm:grid-cols-3 sm:gap-8">
            {cols.map((col) => (
              <section key={col.title}>
                <h3 className="text-[14px] font-semibold text-foreground">{col.title}</h3>
                <ul className="mt-4 flex flex-col gap-3">
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

          <div className="flex w-full flex-wrap items-center justify-between gap-4 py-8 text-[13px]">
            <p className="tabular-nums text-muted-foreground">© {YEAR} swypejobs</p>
            <nav aria-label="Legal" className="flex items-center gap-x-8">
              <Link href="/privacy" className={`${focusRing} text-muted-foreground transition-colors hover:text-primary`}>
                Privacy
              </Link>
              <Link href="/terms" className={`${focusRing} text-muted-foreground transition-colors hover:text-primary`}>
                Terms
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </>
  )
}
