import { DiscoverPageSkeleton } from "@/components/skeletons"
import { cn } from "@/lib/utils"

type DiscoverLoadingProps = {
  label?: string
  className?: string
}

export function DiscoverLoading({ label = "Loading Discover", className }: DiscoverLoadingProps) {
  return <DiscoverPageSkeleton className={cn(className)} label={label} />
}
