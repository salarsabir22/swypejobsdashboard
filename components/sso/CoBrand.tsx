import { IobmMark } from "@/components/brand/IobmMark"
import { Logo } from "@/components/brand/Logo"
import { cn } from "@/lib/utils"

export function CoBrand({
  className,
  priority = false,
}: {
  className?: string
  priority?: boolean
}) {
  return (
    <div className={cn("flex items-center gap-3 sm:gap-4", className)}>
      <IobmMark size={56} priority={priority} />
      <div className="min-w-0">
        <p className="truncate text-[15px] font-semibold leading-tight tracking-[-0.02em] text-[#051C2C] sm:text-[17px]">
          Institute of Business Management
        </p>
        <p className="mt-0.5 text-[12px] text-[#051C2C]/60">Career Development Center</p>
      </div>
      <span className="hidden h-10 w-px bg-[#051C2C]/15 sm:block" aria-hidden />
      <div className="hidden sm:block">
        <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-[#051C2C]/45">Powered by</p>
        <Logo size={26} />
      </div>
    </div>
  )
}
