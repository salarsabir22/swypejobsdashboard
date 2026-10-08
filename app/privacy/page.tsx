import Link from "next/link"
import { Logo } from "@/components/brand/Logo"

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background px-5 py-16 text-foreground">
      <div className="mx-auto max-w-xl">
        <Link href="/" aria-label="swypejobs home" className="inline-block">
          <Logo size={28} />
        </Link>
        <h1 className="mt-10 text-[clamp(2rem,4vw,2.6rem)] font-semibold leading-[1.02] tracking-[-0.045em]">Privacy</h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          We&apos;re drafting a clear privacy policy for swypejobs. For questions in the meantime, email{" "}
          <a href="mailto:hello@swypejobs.app" className="font-medium text-primary underline underline-offset-2">
            hello@swypejobs.app
          </a>
          .
        </p>
        <Link href="/" className="mt-8 inline-block text-sm font-medium text-muted-foreground hover:text-primary">
          ← Back home
        </Link>
      </div>
    </main>
  )
}
