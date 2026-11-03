import Image from "next/image"
import { cn } from "@/lib/utils"

export function IobmMark({
  className,
  priority = false,
}: {
  className?: string
  priority?: boolean
}) {
  return (
    <Image
      src="/brand/iobm-logo.png"
      alt="Institute of Business Management"
      width={220}
      height={56}
      priority={priority}
      className={cn("h-10 w-auto object-contain object-left sm:h-12", className)}
    />
  )
}
