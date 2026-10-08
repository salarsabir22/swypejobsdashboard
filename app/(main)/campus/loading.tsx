import { Skeleton } from "@/components/ui/skeleton"

export default function CampusLoading() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading campus insights">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-4 w-full max-w-xl" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-36 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  )
}
