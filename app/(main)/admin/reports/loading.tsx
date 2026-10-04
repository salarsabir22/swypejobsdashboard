import { ListRowSkeleton } from "@/components/skeletons"
import { Skeleton } from "@/components/ui/skeleton"

export default function AdminReportsLoadingRoute() {
  return (
    <div className="space-y-5" role="status" aria-label="Loading reports">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </div>
      <ListRowSkeleton count={8} />
    </div>
  )
}
