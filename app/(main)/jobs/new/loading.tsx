export default function NewJobLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6" role="status" aria-live="polite">
      <div className="h-8 w-40 animate-pulse rounded-full bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-36 animate-pulse rounded-3xl bg-muted" />
        <div className="h-36 animate-pulse rounded-3xl bg-muted" />
      </div>
      <p className="text-sm text-muted-foreground">Loading post a job…</p>
    </div>
  )
}
