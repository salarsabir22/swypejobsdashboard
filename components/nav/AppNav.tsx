import Link from "next/link"
import { Logo } from "@/components/brand/Logo"
import { Button } from "@/components/ui/button"

/** Signed-out top bar: logos and sign-in only. Signed-in screens use AppChrome. */
export function AppNav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 h-16 border-b border-border/80 bg-background/75 backdrop-blur-2xl backdrop-saturate-150">
      <div className="mx-auto flex h-full w-full max-w-[1728px] items-center justify-between px-4 sm:px-6 lg:px-10 xl:px-14">
        <Link
          href="/"
          className="rounded-md px-1.5 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          aria-label="swypejobs home"
        >
          <Logo size={26} />
        </Link>
        <Button asChild size="sm" className="rounded-full px-4">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    </header>
  )
}
