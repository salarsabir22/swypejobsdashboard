"use client"

import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export function AppMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const lockMobile = pathname === "/discover"

  return (
    <div
      className={cn(
        "mx-auto w-full min-w-0 max-w-[1728px] px-4 sm:px-6 lg:px-10 xl:px-14",
        lockMobile
          ? "flex h-[calc(100dvh-4rem)] flex-col overflow-hidden overscroll-none py-2 pb-[var(--app-tabbar-offset)] lg:h-auto lg:min-h-[calc(100dvh-4rem)] lg:overflow-visible lg:overscroll-auto lg:py-8 lg:pb-8"
          : "min-h-[calc(100dvh-4rem)] py-4 sm:py-5 lg:py-8"
      )}
    >
      {children}
    </div>
  )
}
