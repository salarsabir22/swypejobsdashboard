import Link from "next/link"

export default function PrivacyPage() {
  return (
    <main className="min-h-[50vh] bg-white px-5 py-16 text-black">
      <div className="mx-auto max-w-xl">
        <h1 className="text-2xl font-semibold tracking-tight">Privacy</h1>
        <p className="mt-4 text-sm leading-relaxed text-black/60">
          We&apos;re drafting a clear privacy policy for swypejobs. For questions in the meantime, email{" "}
          <a href="mailto:hello@swypejobs.app" className="underline underline-offset-2">
            hello@swypejobs.app
          </a>
          .
        </p>
        <Link href="/" className="mt-8 inline-block text-sm font-medium text-black/50 hover:text-black">
          ← Back home
        </Link>
      </div>
    </main>
  )
}
