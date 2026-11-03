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
    <div
      className={cn(
        "inline-flex flex-wrap items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-[0_12px_40px_-24px_rgba(5,28,44,0.45)] sm:gap-4 sm:px-5",
        className
      )}
    >
      <IobmMark priority={priority} />
      <span
        className="text-[13px] font-medium uppercase tracking-[0.18em] text-[#051C2C]/45"
        aria-hidden
      >
        with
      </span>
      <Logo size={28} />
    </div>
  )
}
