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
      className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-muted/50"
    >
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarImage src={image || undefined} alt="" />
        <AvatarFallback className="text-xs">{getInitials(title)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate font-heading text-sm font-medium text-foreground">{title}</p>
        {subtitle ? <p className="truncate font-body text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
      <div className="shrink-0 text-right">
        {meta ? <p className="font-body text-[11px] text-muted-foreground">{meta}</p> : null}
        {action ? <p className="font-body text-xs font-medium text-primary">{action}</p> : null}
      </div>
    </Link>
  )
}
