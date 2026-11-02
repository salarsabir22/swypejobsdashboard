import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-64 w-full rounded-2xl" />
      <Skeleton className="h-48 w-full rounded-2xl" />
      <Skeleton className="h-40 w-full rounded-2xl" />
    </div>
  )
}
