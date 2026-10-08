import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

export function DiscoverPageSkeleton({
  className,
  label = "Loading Discover",
}: {
  className?: string
  label?: string
}) {
  return (
    <div
      className={cn(
        "mx-auto flex h-full min-h-0 w-full max-w-[1180px] flex-1 flex-col gap-2 overflow-hidden lg:h-auto lg:gap-6 lg:overflow-visible",
        className
      )}
      role="status"
      aria-label={label}
    >
      <div className="shrink-0 space-y-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-8 w-52 max-w-full" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] lg:grid-cols-[minmax(0,34rem)_minmax(0,1fr)] lg:grid-rows-none lg:items-start lg:gap-8">
        <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-border bg-card">
          <Skeleton className="min-h-[14rem] flex-1 rounded-none lg:min-h-[22rem]" />
          <div className="space-y-3 p-4">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-16 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-14 rounded-full" />
            </div>
          </div>
          <div className="flex shrink-0 gap-3 p-4 pt-0">
            <Skeleton className="h-10 flex-1 rounded-full" />
            <Skeleton className="h-10 flex-1 rounded-full" />
          </div>
        </div>
        <div className="hidden space-y-3 lg:block">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  )
}

export function ChatInboxSkeleton() {
  return (
    <div className="flex h-full min-h-0 min-w-0 bg-background" role="status" aria-label="Loading messages">
      <div className="flex h-full w-full min-w-0 flex-col bg-card/80 lg:w-[22.5rem] lg:shrink-0 lg:border-r lg:border-border xl:w-[26rem]">
        <div className="space-y-4 px-4 pb-3 pt-5">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-10 w-full rounded-full" />
        </div>
        <div className="space-y-1 px-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-2 py-3">
              <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-3.5 w-1/2" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="hidden min-h-0 min-w-0 flex-1 lg:flex">
        <ChatThreadSkeleton />
      </div>
    </div>
  )
}

export function ChatThreadSkeleton() {
  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-background" role="status" aria-label="Loading conversation">
      <div className="flex items-center gap-3 border-b border-border px-3 py-3">
        <Skeleton className="h-9 w-9 rounded-full" />
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col justify-end gap-3 px-4 py-4">
        <Skeleton className="h-12 w-[70%] rounded-2xl" />
        <Skeleton className="ml-auto h-16 w-[55%] rounded-2xl" />
        <Skeleton className="h-10 w-[45%] rounded-2xl" />
        <Skeleton className="ml-auto h-12 w-[62%] rounded-2xl" />
      </div>
      <div className="border-t border-border p-3">
        <Skeleton className="h-11 w-full rounded-full" />
      </div>
    </div>
  )
}

export function PipelineSkeleton() {
  return (
    <div className="space-y-5 lg:space-y-8" role="status" aria-label="Loading pipeline">
      <div className="space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="flex gap-2 lg:hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 flex-1 rounded-full" />
        ))}
      </div>
      <div className="hidden grid-cols-4 gap-4 lg:grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-2xl border border-border bg-card p-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        ))}
      </div>
      <div className="space-y-3 lg:hidden">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
      </div>
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading dashboard">
      <div className="space-y-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-48 w-full rounded-2xl" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-56 rounded-2xl" />
        <Skeleton className="h-56 rounded-2xl" />
      </div>
    </div>
  )
}

export function JobsListSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading jobs">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-8 w-36" />
        </div>
        <Skeleton className="h-10 w-28 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  )
}

export function FeedCardsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4" role="status" aria-label="Loading feed">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="space-y-4 p-5">
            <div className="flex gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2 pt-1">
                <Skeleton className="h-3 w-36" />
                <Skeleton className="h-3 w-52 max-w-full" />
              </div>
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
          </div>
          <Skeleton className="h-40 w-full rounded-none" />
        </div>
      ))}
    </div>
  )
}

export function NotificationListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card" role="status" aria-label="Loading notifications">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 px-5 py-4">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function ProfilePageSkeleton() {
  return (
    <div className="mx-auto max-w-3xl space-y-6" role="status" aria-label="Loading profile">
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <Skeleton className="h-32 w-full rounded-none sm:h-40" />
        <div className="px-5 pb-6 sm:px-8">
          <div className="flex gap-4">
            <Skeleton className="-mt-12 h-24 w-24 shrink-0 rounded-full ring-4 ring-card sm:h-[6.5rem] sm:w-[6.5rem]" />
            <div className="min-w-0 flex-1 space-y-2 pt-4">
              <Skeleton className="h-7 w-48 max-w-full" />
              <Skeleton className="h-4 w-36" />
            </div>
          </div>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-[240px_1fr]">
        <Skeleton className="h-40 rounded-2xl" />
        <div className="space-y-4">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      </div>
    </div>
  )
}

export function CommunityListSkeleton({ showHeader = true }: { showHeader?: boolean }) {
  return (
    <div className="space-y-6" role="status" aria-label="Loading community">
      {showHeader ? (
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-40" />
        </div>
      ) : null}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48 max-w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ChannelChatSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col" role="status" aria-label="Loading channel">
      <div className="flex-1 space-y-3 px-4 py-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={i % 2 ? "ml-auto w-[60%] space-y-2" : "flex gap-2"}>
            {i % 2 ? null : <Skeleton className="h-8 w-8 shrink-0 rounded-full" />}
            <Skeleton className="h-12 w-full rounded-2xl" />
          </div>
        ))}
      </div>
      <div className="border-t border-border p-3">
        <Skeleton className="h-11 w-full rounded-full" />
      </div>
    </div>
  )
}

export function ApplicantListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading applicants">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border p-4">
          <div className="flex items-start gap-4">
            <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56 max-w-full" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Skeleton className="h-9 w-20 rounded-xl" />
            <Skeleton className="h-9 flex-1 rounded-xl" />
            <Skeleton className="h-9 flex-1 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function JobDetailSkeleton() {
  return (
    <div className="space-y-8" role="status" aria-label="Loading job">
      <div className="flex items-start gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-7 w-64 max-w-full" />
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <Skeleton className="h-48 w-full rounded-2xl" />
      <Skeleton className="h-40 w-full rounded-2xl" />
    </div>
  )
}

export function ListRowSkeleton({ count = 5, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)} role="status" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-2">
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-1/2" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function AuthFormSkeleton() {
  return (
    <div role="status" aria-label="Loading sign in">
      <div className="space-y-2">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-4 w-44" />
      </div>
      <div className="mt-8 space-y-4">
        <Skeleton className="h-12 w-full rounded-full" />
        <Skeleton className="h-12 w-full rounded-full" />
        <Skeleton className="h-12 w-full rounded-full" />
        <Skeleton className="h-12 w-full rounded-full" />
      </div>
    </div>
  )
}

export function FormPageSkeleton() {
  return (
    <div className="mx-auto max-w-xl space-y-6" role="status" aria-label="Loading form">
      <div className="space-y-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="space-y-5 rounded-xl border border-border bg-card p-6">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-11 w-28 rounded-full" />
      </div>
    </div>
  )
}

export function LegalPageSkeleton() {
  return (
    <main className="min-h-[50vh] bg-white px-5 py-16" role="status" aria-label="Loading">
      <div className="mx-auto max-w-xl space-y-4">
        <Skeleton className="h-8 w-28 bg-black/10" />
        <Skeleton className="h-4 w-full bg-black/10" />
        <Skeleton className="h-4 w-5/6 bg-black/10" />
        <Skeleton className="h-4 w-2/3 bg-black/10" />
      </div>
    </main>
  )
}

export function WaitlistPageSkeleton() {
  return (
    <div className="flex min-h-screen flex-col bg-black" role="status" aria-label="Loading waitlist">
      <div className="mx-auto flex w-full max-w-[1120px] items-center justify-between px-5 pt-9 sm:px-10">
        <Skeleton className="h-5 w-24 bg-white/15" />
        <Skeleton className="h-4 w-16 bg-white/10" />
      </div>
      <div className="flex flex-1 items-center justify-center px-5 py-16">
        <div className="w-full max-w-lg space-y-4 rounded-2xl border border-white/10 bg-white/[0.06] p-10">
          <Skeleton className="mx-auto h-6 w-28 bg-white/15" />
          <Skeleton className="mx-auto h-4 w-64 max-w-full bg-white/10" />
          <Skeleton className="mx-auto h-11 w-32 rounded-full bg-white/15" />
        </div>
      </div>
    </div>
  )
}

export function LandingPageSkeleton() {
  return (
    <div className="min-h-screen bg-white" role="status" aria-label="Loading swypejobs">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
        <Skeleton className="h-8 w-32 bg-black/10" />
        <div className="hidden gap-3 md:flex">
          <Skeleton className="h-4 w-16 bg-black/10" />
          <Skeleton className="h-4 w-20 bg-black/10" />
          <Skeleton className="h-4 w-16 bg-black/10" />
        </div>
        <Skeleton className="h-10 w-24 rounded-full bg-black/10" />
      </div>
      <div className="mx-auto max-w-3xl space-y-6 px-5 py-24 text-center">
        <Skeleton className="mx-auto h-6 w-40 rounded-full bg-black/10" />
        <Skeleton className="mx-auto h-12 w-full max-w-lg bg-black/10" />
        <Skeleton className="mx-auto h-6 w-80 max-w-full bg-black/10" />
        <div className="flex justify-center gap-3">
          <Skeleton className="h-12 w-36 rounded-full bg-black/10" />
          <Skeleton className="h-12 w-36 rounded-full bg-black/10" />
        </div>
      </div>
      <div className="mx-auto grid max-w-5xl gap-4 px-5 pb-16 sm:grid-cols-3">
        <Skeleton className="h-40 rounded-2xl bg-black/10" />
        <Skeleton className="h-40 rounded-2xl bg-black/10" />
        <Skeleton className="h-40 rounded-2xl bg-black/10" />
      </div>
    </div>
  )
}
