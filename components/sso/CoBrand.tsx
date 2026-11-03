import { IobmMark } from "@/components/brand/IobmMark"
import { Logo } from "@/components/brand/Logo"
import { cn } from "@/lib/utils"

export function CoBrand({
  className,
  priority = false,
  size = 40,
}: {
  className?: string
  priority?: boolean
  size?: number
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <IobmMark size={size} priority={priority} />
      <span className="select-none text-[13px] font-medium text-[#8A8F98]" aria-hidden>
        ×
      </span>
      <Logo size={Math.round(size * 0.72)} tone="dark" className="text-[#111111]" />
    </div>
  )
}
