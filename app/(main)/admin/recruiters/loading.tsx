import { ListRowSkeleton } from "@/components/skeletons"
import { Skeleton } from "@/components/ui/skeleton"

export default function AdminRecruitersLoadingRoute() {
  return (
    <div className="mx-auto max-w-4xl space-y-5" role="status" aria-label="Loading recruiters">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <ListRowSkeleton count={6} />
    </div>
  )
}
