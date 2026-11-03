import { IobmMark } from "@/components/brand/IobmMark"
import { cn } from "@/lib/utils"

export function CoBrand({
  className,
  priority = false,
}: {
  className?: string
  priority?: boolean
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <IobmMark size={48} priority={priority} />
      <div className="min-w-0">
        <p className="truncate text-[15px] font-semibold leading-tight tracking-[-0.02em] text-[#111111]">
          Institute of Business Management
        </p>
        <p className="mt-0.5 text-[12px] text-[#5C6370]">Career Development Center</p>
      </div>
    </div>
  )
}
