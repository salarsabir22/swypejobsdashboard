"use client"

import { usePathname, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function CampusFilter({ current }: { current: string | null }) {
  const pathname = usePathname()
  const params = useSearchParams()
  const value = current || params.get("campus") || ""

  const range = params.get("range")
  const from = params.get("from")
  const to = params.get("to")

  return (
    <form className="flex max-w-md flex-wrap gap-2" action={pathname} method="get">
      {range ? <input type="hidden" name="range" value={range} /> : null}
      {from ? <input type="hidden" name="from" value={from} /> : null}
      {to ? <input type="hidden" name="to" value={to} /> : null}
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
