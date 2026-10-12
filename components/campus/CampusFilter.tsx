"use client"

import { usePathname, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function CampusFilter({ current }: { current: string | null }) {
  const pathname = usePathname()
  const params = useSearchParams()
  const value = current || params.get("campus") || ""

  return (
    <form className="flex max-w-md flex-wrap gap-2" action={pathname} method="get">
      <Input
        name="campus"
        defaultValue={value}
        placeholder="Filter by university name"
        className="min-w-0 flex-1"
      />
      <Button type="submit">Apply</Button>
    </form>
  )
}
