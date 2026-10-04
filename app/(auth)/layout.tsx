import Link from "next/link"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col apple-grouped-bg text-foreground selection:bg-primary/20">
      <header className="flex h-16 shrink-0 items-center px-4 sm:px-8">
        <Link href="/" className="font-heading text-[17px] font-semibold tracking-tight text-foreground">
          swypejobs<span className="text-muted-foreground">.</span>
        </Link>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-8 sm:py-16">
        <div className="w-full max-w-md lg:max-w-lg">{children}</div>
      </div>

      <footer className="mx-auto w-full max-w-[1280px] shrink-0 px-4 py-8 sm:px-8 lg:px-24">
        <p className="text-center font-body text-[11px] text-muted-foreground sm:text-right sm:text-xs">
          © {new Date().getFullYear()} swypejobs
        </p>
      </footer>
    </div>
  )
}
