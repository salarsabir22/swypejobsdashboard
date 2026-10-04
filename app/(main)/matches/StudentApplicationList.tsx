"use client"

import Link from "next/link"
import { Building2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ShowMoreButton, ShowMoreList } from "@/components/ui/show-more-list"

export type StudentApplicationItem = {
  id: string
  href: string | null
  title: string
  company: string | null
  logoUrl: string | null
  meta: string
  status: string
}

export function StudentApplicationList({ items }: { items: StudentApplicationItem[] }) {
  return (
    <ul className="m-0 list-none space-y-2 p-0">
      <ShowMoreList
        items={items}
        getKey={(item) => item.id}
        initial={6}
        step={6}
        renderItem={(item) => {
          const inner = (
            <Card className={item.href ? "transition hover:border-primary/30" : ""}>
              <CardContent className="flex items-start gap-3 p-4 sm:items-center">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted ring-1 ring-border">
                  {item.logoUrl ? (
                    <img src={item.logoUrl} className="h-full w-full object-cover" alt="" />
                  ) : (
                    <Building2 className="h-5 w-5 text-muted-foreground" aria-hidden />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-heading text-sm font-semibold text-foreground">{item.title}</p>
                  {item.company ? (
                    <p className="truncate font-body text-xs text-muted-foreground">{item.company}</p>
                  ) : null}
                  <p className="mt-0.5 font-body text-[11px] text-muted-foreground">{item.meta}</p>
                </div>
                <Badge variant={item.status === "Applied" ? "outline" : "default"} className="shrink-0">
                  {item.status}
                </Badge>
              </CardContent>
            </Card>
          )

          return (
            <li>
              {item.href ? (
                <Link href={item.href} className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {inner}
                </Link>
              ) : (
                inner
              )}
            </li>
          )
        }}
        footer={(remaining, showMore) => (
          <li className="pt-1">
            <ShowMoreButton
              remaining={remaining}
              onClick={showMore}
              className="h-10 rounded-full border border-border"
            />
          </li>
        )}
      />
    </ul>
  )
}
