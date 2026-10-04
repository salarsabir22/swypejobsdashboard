"use client"

import { useMemo } from "react"

const COLORS = ["#FF4D6D", "#FFD166", "#06D6A0", "#4CC9F0", "#F72585", "#7B2CBF", "#F77F00"]

export function ConfettiBurst({ show }: { show: boolean }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        id: i,
        left: 8 + ((i * 17) % 84),
        delay: (i % 8) * 0.04,
        duration: 0.85 + (i % 5) * 0.12,
        color: COLORS[i % COLORS.length],
        rotate: (i * 37) % 360,
        size: 6 + (i % 4) * 2,
      })),
    []
  )

  if (!show) return null

  return (
    <div className="pointer-events-none fixed inset-0 z-[80] overflow-hidden" aria-hidden>
      {pieces.map((p) => (
        <span
          key={p.id}
          className="jm-confetti"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 0.55,
            background: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
    </div>
  )
}
