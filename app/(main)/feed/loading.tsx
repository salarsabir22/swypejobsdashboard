import { FeedCardsSkeleton } from "@/components/skeletons"

export default function FeedLoadingRoute() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-24 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-48 animate-pulse rounded-md bg-muted" />
      </div>
      <FeedCardsSkeleton />
    </div>
  )
}
