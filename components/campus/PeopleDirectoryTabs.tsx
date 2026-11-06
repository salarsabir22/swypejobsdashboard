import Link from "next/link"
import { Button } from "@/components/ui/button"
import { campusQueryHref } from "@/lib/campus/reports"
import type { CampusSnapshot } from "@/lib/campus/types"
import type { CampusDirectoryKind } from "@/lib/campus/directory"
import { cn } from "@/lib/utils"

const TABS: { id: CampusDirectoryKind; label: string; href: string }[] = [
  { id: "students", label: "Students", href: "/campus/people?kind=students" },
  { id: "alumni", label: "Alumni", href: "/campus/people?kind=alumni" },
  { id: "groups", label: "Groups", href: "/campus/people/groups" },
  { id: "employers", label: "Employers", href: "/campus/employers" },
]

export function PeopleDirectoryTabs({
  active,
  snapshot,
  counts,
}: {
  active: CampusDirectoryKind
  snapshot: Pick<CampusSnapshot, "access" | "period">
  counts?: Partial<Record<CampusDirectoryKind, number>>
}) {
  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Partners directories">
      {TABS.map((tab) => {
        const selected = active === tab.id
        const count = counts?.[tab.id]
        return (
          <Button
            key={tab.id}
            asChild
            size="sm"
            variant={selected ? "default" : "outline"}
            className={cn("rounded-full", !selected && "text-muted-foreground")}
          >
            <Link href={campusQueryHref(tab.href, snapshot)} aria-current={selected ? "page" : undefined}>
              {tab.label}
              {typeof count === "number" ? (
                <span className={cn("ml-1 tabular-nums", selected ? "text-primary-foreground/80" : "text-muted-foreground")}>
                  {count.toLocaleString()}
                </span>
              ) : null}
            </Link>
          </Button>
        )
      })}
    </div>
  )
}
