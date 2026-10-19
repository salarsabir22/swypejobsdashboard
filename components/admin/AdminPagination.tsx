import Link from "next/link"
import { Button } from "@/components/ui/button"

export function AdminPagination({
  page,
  totalPages,
  hrefFor,
}: {
  page: number
  totalPages: number
  hrefFor: (page: number) => string
}) {
  const safePage = Math.min(Math.max(1, page), Math.max(1, totalPages))
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3">
      <p className="text-[13px] text-muted-foreground">
        Page {safePage} of {Math.max(1, totalPages)}
      </p>
      <div className="flex flex-wrap gap-2">
        {safePage <= 1 ? (
          <Button size="sm" variant="outline" className="rounded-full" disabled>
            Previous
          </Button>
        ) : (
          <Button asChild size="sm" variant="outline" className="rounded-full">
            <Link href={hrefFor(safePage - 1)}>Previous</Link>
          </Button>
        )}
        {safePage >= totalPages ? (
          <Button size="sm" variant="outline" className="rounded-full" disabled>
            Next
          </Button>
        ) : (
          <Button asChild size="sm" variant="outline" className="rounded-full">
            <Link href={hrefFor(safePage + 1)}>Next</Link>
          </Button>
        )}
      </div>
    </div>
  )
}

export function AdminFilterTabs({
  tabs,
  current,
  hrefFor,
}: {
  tabs: { value: string; label: string }[]
  current: string
  hrefFor: (value: string) => string
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {tabs.map((tab) => (
        <Button
          key={tab.value}
          asChild
          size="sm"
          variant={current === tab.value ? "default" : "outline"}
          className="rounded-full"
        >
          <Link href={hrefFor(tab.value)}>{tab.label}</Link>
        </Button>
      ))}
    </div>
  )
}
