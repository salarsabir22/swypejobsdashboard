import { Skeleton } from "@/components/ui/skeleton"

export default function ResumeLoading() {
  return (
    <div className="mx-auto max-w-[1200px] space-y-6" role="status" aria-label="Loading resume builder">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-4 w-full max-w-xl" />
      <div className="grid gap-8 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
        <div className="space-y-3">
          <Skeleton className="h-11 w-full rounded-full" />
          <Skeleton className="h-11 w-full rounded-full" />
          <Skeleton className="h-28 w-full rounded-2xl" />
        </div>
        <Skeleton className="min-h-[520px] w-full rounded-2xl" />
      </div>
    </div>
  )
}
