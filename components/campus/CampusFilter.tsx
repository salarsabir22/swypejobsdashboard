"use client"

import { usePathname, useSearchParams } from "next/navigation"

export function CampusFilter({ current }: { current: string | null }) {
  const pathname = usePathname()
  const params = useSearchParams()
  const value = current || params.get("campus") || ""

  return (
    <form className="flex max-w-md flex-wrap gap-2" action={pathname} method="get">
      <input
        name="campus"
        defaultValue={value}
        placeholder="Filter by university name"
        className="h-11 min-w-0 flex-1 rounded-full border border-input bg-white px-4 text-sm"
      />
      <button type="submit" className="h-11 rounded-full bg-primary px-4 text-[13px] font-semibold text-white">
        Apply
      </button>
    </form>
  )
}
