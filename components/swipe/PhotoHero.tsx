import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function PhotoHero({
  src,
  fallback,
  children,
  className,
  fit = "cover",
}: {
  src?: string | null
  fallback: ReactNode
  children: ReactNode
  className?: string
  fit?: "cover" | "contain"
}) {
  return (
    <div
      className={cn(
        "relative isolate min-h-0 overflow-hidden bg-[#1d1d1f]",
        "max-lg:min-h-[6.5rem] max-lg:flex-1",
        "lg:aspect-[4/5] lg:h-auto lg:max-h-[min(36rem,62vh)] lg:flex-none",
        className
      )}
    >
      {src ? (
        <>
          <img
            src={src}
            alt=""
            className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl opacity-50"
            draggable={false}
          />
          <img
            src={src}
            alt=""
            className={cn(
              "absolute inset-0 h-full w-full",
              fit === "contain"
                ? "object-contain object-center px-3 pb-24 pt-3 sm:px-5 sm:pb-28 sm:pt-5"
                : "object-cover object-center"
            )}
            draggable={false}
          />
        </>
      ) : (
        <div className="apple-vibrancy-header absolute inset-0 flex items-center justify-center">{fallback}</div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/10" />
      <div className="absolute inset-x-0 bottom-0 z-10 p-4 text-white sm:p-5">{children}</div>
    </div>
  )
}
