export function KpiSparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null

  const max = Math.max(...values, 1)
  const width = 96
  const height = 32
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * width
    const y = height - (value / max) * (height - 4) - 2
    return `${x},${y}`
  })

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden className="text-primary">
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points.join(" ")}
        opacity={0.9}
      />
    </svg>
  )
}
