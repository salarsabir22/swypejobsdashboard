"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Users, Building2, Hash, Zap } from "lucide-react"
import { cn } from "@/lib/utils"

const navLinks = [
  { href: "/admin/users",      icon: Users,     label: "Users" },
  { href: "/admin/recruiters", icon: Building2, label: "Recruiters" },
  { href: "/admin/channels",   icon: Hash,      label: "Channels" },
]

export function AdminTopNav() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 glass border-b border-black/10">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-neutral-200 flex items-center justify-center shadow-[0_0_10px_-2px_rgba(255,255,255,0.6)]">
            <Zap className="h-3.5 w-3.5 text-black" strokeWidth={2.5} />
          </div>
          <span className="font-heading font-bold text-base">
            Job<span className="gradient-text">Match</span>{" "}
            <span className="font-data text-[10px] tracking-widest uppercase text-neutral-700 font-normal">Admin</span>
          </span>
        </div>
        <nav className="flex gap-1">
          {navLinks.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-data text-[11px] tracking-wider uppercase transition-all duration-200",
                  active
                    ? "bg-neutral-100 text-black border border-black/15"
                    : "text-neutral-800 hover:text-black hover:bg-neutral-50"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
