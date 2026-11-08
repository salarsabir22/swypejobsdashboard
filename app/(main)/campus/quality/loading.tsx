export default function CampusQualityLoading() {
  return (
    <div className="space-y-6 p-6" role="status" aria-live="polite">
      <div className="h-8 w-48 animate-pulse rounded-full bg-muted" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
      <p className="text-sm text-muted-foreground">Loading match quality…</p>
    </div>
  )
}
