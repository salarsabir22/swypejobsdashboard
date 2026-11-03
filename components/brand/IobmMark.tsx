import Image from "next/image"
import { cn } from "@/lib/utils"

export function IobmMark({
  className,
  size = 56,
  priority = false,
}: {
  className?: string
  size?: number
  priority?: boolean
}) {
  return (
    <Image
      src="/brand/iobm-logo.png"
      alt="Institute of Business Management"
      width={size}
      height={size}
      priority={priority}
      className={cn("rounded-xl object-cover", className)}
      style={{ width: size, height: size }}
    />
  )
}
