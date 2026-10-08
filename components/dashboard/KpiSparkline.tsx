import { cn } from "@/lib/utils"

export function KpiSparkline({ values, className }: { values: number[]; className?: string }) {
  if (values.length < 2) return null

  const max = Math.max(...values, 1)
  const width = 104
  const height = 36
  const pts = values.map((value, index) => {
    const x = (index / (values.length - 1)) * width
    const y = height - (value / max) * (height - 8) - 4
    return [x, y] as const
  })
  const line = pts.map(([x, y]) => `${x},${y}`).join(" ")
  const area = `0,${height} ${line} ${width},${height}`
  const [lastX, lastY] = pts[pts.length - 1]

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden
      className={cn("overflow-visible text-primary", className)}
    >
      <polygon points={area} fill="currentColor" opacity={0.12} />
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={line}
      />
      <circle cx={lastX} cy={lastY} r="3.5" fill="currentColor" />
      <circle cx={lastX} cy={lastY} r="7" fill="currentColor" opacity={0.18} />
    </svg>
  )
}
