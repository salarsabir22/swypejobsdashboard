import { ChatThreadSkeleton } from "@/components/skeletons"

export default function ChatThreadLoadingRoute() {
  return (
    <div className="h-[calc(100dvh-11.25rem)] overflow-hidden rounded-2xl border border-border bg-card lg:h-[calc(100dvh-10rem)]">
      <ChatThreadSkeleton />
    </div>
  )
}
