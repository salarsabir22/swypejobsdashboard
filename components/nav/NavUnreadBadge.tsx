export function NavUnreadBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null
  const label = count > 99 ? "99+" : String(count)
  return (
    <span
      className={
        className ??
        "absolute -right-1.5 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-white"
      }
    >
      {label}
    </span>
  )
}
