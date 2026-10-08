import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getInitials } from "@/lib/utils"

export function DashboardFeedRow({
  href,
  image,
  title,
  subtitle,
  meta,
  action,
}: {
  href: string
  image?: string | null
  title: string
  subtitle?: string | null
  meta?: string | null
  action?: string
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-2xl px-2 py-2.5 transition-colors hover:bg-secondary/70"
    >
      <Avatar className="h-11 w-11 shrink-0 ring-2 ring-white">
        <AvatarImage src={image || undefined} alt="" />
        <AvatarFallback className="text-xs">{getInitials(title)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate font-heading text-[15px] font-semibold tracking-[-0.01em] text-foreground">{title}</p>
        {subtitle ? <p className="truncate text-[13px] text-muted-foreground">{subtitle}</p> : null}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {meta ? <p className="text-[12px] text-muted-foreground">{meta}</p> : null}
        {action ? (
          <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[12px] font-semibold text-primary transition-colors group-hover:bg-primary group-hover:text-white">
            {action}
          </span>
        ) : null}
      </div>
    </Link>
  )
}
