import { NotificationListSkeleton } from "@/components/skeletons"
import { Skeleton } from "@/components/ui/skeleton"

export default function NotificationsLoadingRoute() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-4 w-56" />
      </div>
      <NotificationListSkeleton />
    </div>
  )
}
