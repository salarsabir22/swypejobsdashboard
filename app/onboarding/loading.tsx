import { Skeleton } from "@/components/ui/skeleton"

export default function OnboardingLoadingRoute() {
  return (
    <div className="flex min-h-screen flex-col bg-background px-6 py-16" role="status" aria-label="Loading onboarding">
      <div className="mx-auto w-full max-w-lg space-y-6">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-8 w-56 max-w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-48 w-full rounded-2xl" />
        <Skeleton className="h-12 w-full rounded-full" />
      </div>
    </div>
  )
}
