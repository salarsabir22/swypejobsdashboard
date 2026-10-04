import { ChannelChatSkeleton } from "@/components/skeletons"
import { Skeleton } from "@/components/ui/skeleton"

export default function ChannelLoadingRoute() {
  return (
    <div className="flex h-[calc(100dvh-11.25rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card lg:h-[calc(100dvh-10rem)]">
      <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
        <Skeleton className="h-9 w-9 rounded-md" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <ChannelChatSkeleton />
    </div>
  )
}
